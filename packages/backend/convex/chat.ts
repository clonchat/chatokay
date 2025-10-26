import { Agent } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { v } from "convex/values";
import { z } from "zod";
import { api, components } from "./_generated/api.js";
import { action } from "./_generated/server.js";

// Initialize OpenRouter provider
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Schema definitions for tools
const getAvailableSlotsSchema = z.object({
  date: z
    .string()
    .describe(
      "Fecha en formato YYYY-MM-DD. Por ejemplo: 2025-01-15. " +
        "Calcula la fecha correcta basándote en el día mencionado por el usuario."
    ),
});

const createAppointmentSchema = z.object({
  customerName: z.string().describe("Nombre completo del cliente"),
  customerEmail: z.string().optional().describe("Email del cliente (opcional)"),
  customerPhone: z
    .string()
    .optional()
    .describe("Teléfono del cliente (opcional)"),
  appointmentTime: z
    .string()
    .describe(
      "Fecha y hora de la cita en formato YYYY-MM-DDTHH:mm. " +
        "Por ejemplo: 2025-01-15T10:00"
    ),
  serviceName: z
    .string()
    .describe("Nombre del servicio que el cliente desea reservar"),
  notes: z
    .string()
    .optional()
    .describe("Notas adicionales sobre la cita (opcional)"),
});

type GetAvailableSlotsParams = z.infer<typeof getAvailableSlotsSchema>;
type CreateAppointmentParams = z.infer<typeof createAppointmentSchema>;

/**
 * Builds a comprehensive system prompt with business context
 */
function buildSystemPrompt(
  business: { name?: string; description?: string },
  currentDate: string,
  currentDay: string
): string {
  return `Eres un asistente virtual para ${business.name ?? "el negocio"}, un negocio de servicios.

  INFORMACIÓN DEL NEGOCIO:
  - Nombre: ${business.name}
  - Descripción: ${business.description || "No disponible"}
  
  TU OBJETIVO:
  Ayudar a los clientes a:
  1. Conocer los servicios disponibles
  2. Consultar disponibilidad de horarios
  3. Agendar citas
  
  INSTRUCCIONES:
  - Sé amable, profesional y conciso
  - Pregunta por la información necesaria de forma natural
  - Para agendar una cita necesitas: nombre del cliente, servicio, fecha y hora
  - Opcionalmente puedes pedir email y teléfono para confirmaciones
  - Confirma siempre los detalles antes de crear la cita
  - Si no tienes información, usa las herramientas disponibles para consultarla
  - Cuando el usuario pregunte por servicios, usa la herramienta get_services
  - Cuando el usuario pregunte por disponibilidad, usa get_available_slots
  - Cuando tengas todos los datos para crear una cita, usa create_appointment
  
  CONTEXTO TEMPORAL:
  - Fecha de hoy: ${currentDate}
  - Día de la semana: ${currentDay}
  - Cuando el usuario mencione días como "miércoles", "jueves", etc., calcula la fecha exacta
  - Los días de la semana en español son: lunes, martes, miércoles, jueves, viernes, sábado, domingo
  
  IMPORTANTE:
  - Siempre llama a get_services cuando te pregunten por los servicios
  - Siempre llama a get_available_slots cuando te pregunten por disponibilidad
  - Solo crea la cita cuando tengas todos los datos confirmados
  - Recuerda contestar en formato markdown.
  
  Responde en español de forma natural y conversacional.`;
}

/**
 * Chat action that handles customer messages using Convex native agent
 * Each session is independent - no thread persistence across refreshes
 */
export const sendMessage = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(
          v.literal("user"),
          v.literal("assistant"),
          v.literal("system")
        ),
        content: v.string(),
      })
    ),
    subdomain: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args): Promise<{ content: string }> => {
    console.log("[Chat] Starting sendMessage handler");

    // Fetch business configuration
    const business = await ctx.runQuery(api.businesses.getBySubdomain, {
      subdomain: args.subdomain,
    });

    if (!business) {
      throw new Error(`Business not found for subdomain: ${args.subdomain}`);
    }

    // Generate contextual information
    const currentDate = new Date().toISOString().split("T")[0] ?? "";
    const currentDay =
      new Date().toLocaleDateString("es-ES", {
        weekday: "long",
      }) ?? "Unknown";

    // Build system prompt
    const systemPrompt = buildSystemPrompt(
      { name: business.name, description: business.description },
      currentDate,
      currentDay
    );

    // Define tools that will be used by the agent
    const tools = {
      get_services: {
        description:
          "Obtiene la lista completa de servicios que ofrece el negocio. " +
          "Usa esta herramienta cuando el cliente pregunte qué servicios están disponibles.",
        inputSchema: z.object({}),
        execute: async () => {
          const businessData = await ctx.runQuery(
            api.businesses.getBySubdomain,
            { subdomain: args.subdomain }
          );
          return {
            services: businessData?.services || [],
            businessName: businessData?.name,
          };
        },
      },
      get_available_slots: {
        description:
          "Consulta los horarios disponibles para una fecha específica. " +
          "Retorna una lista de slots de tiempo disponibles para ese día.",
        inputSchema: getAvailableSlotsSchema,
        execute: async ({ date }: GetAvailableSlotsParams) => {
          const slots = await ctx.runQuery(api.appointments.getAvailableSlots, {
            businessId: business._id,
            date,
          });
          const dateObj = new Date(`${date}T00:00:00`);
          const dayName = dateObj.toLocaleDateString("es-ES", {
            weekday: "long",
          });
          return {
            date,
            dayName,
            availableSlots: slots.filter(
              (slot: { isBooked: boolean }) => !slot.isBooked
            ),
          };
        },
      },
      create_appointment: {
        description:
          "Crea una nueva cita para el cliente. " +
          "Asegúrate de tener toda la información necesaria antes de llamar a esta función.",
        inputSchema: createAppointmentSchema,
        execute: async (params: CreateAppointmentParams) => {
          try {
            const appointmentId = await ctx.runMutation(
              api.appointments.createAppointment,
              {
                businessId: business._id,
                customerName: params.customerName,
                customerEmail: params.customerEmail,
                customerPhone: params.customerPhone,
                appointmentTime: params.appointmentTime,
                serviceName: params.serviceName,
                notes: params.notes,
              }
            );
            return {
              success: true,
              appointmentId: appointmentId.toString(),
              message: "Cita creada exitosamente",
              details: params,
            };
          } catch (error) {
            return {
              success: false,
              message:
                error instanceof Error
                  ? error.message
                  : "Error al crear la cita",
              details: params,
            };
          }
        },
      },
    };

    // Create agent instance with tools
    const agent = new Agent(components.agent, {
      name: `Agent for ${business.name}`,
      languageModel: openrouter("minimax/minimax-m2:free"),
      instructions: systemPrompt,
      tools,
      maxSteps: 5,
    });

    // Extract the latest user message
    const latestMessage = args.messages[args.messages.length - 1];
    const userMessage = latestMessage?.content || "";

    // Convert frontend messages to format expected by Convex Agent
    // The agent will use the userId to maintain conversation context
    const agentMessages = args.messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

    // Use the session ID from the frontend to maintain conversation context
    // within the same browser session. Each page refresh gets a new sessionId.
    const sessionUserId = args.sessionId;

    // Send message to agent and get response
    // Pass all messages for full conversation context
    console.log("[Chat] Calling agent with session:", sessionUserId);
    console.log("[Chat] Total messages in context:", agentMessages.length);

    const result = await agent.generateText(
      ctx,
      { userId: sessionUserId },
      {
        messages: agentMessages,
      }
    );

    console.log("[Chat] Agent response received:", {
      text: result.text,
      finishReason: result.finishReason,
    });

    // Remove any reasoning tags from the response
    let cleanText =
      result.text || "Lo siento, no pude procesar tu solicitud correctamente.";

    // Remove <think>, <think>, <reasoning> tags and their content
    cleanText = cleanText.replace(
      /<think>[\s\S]*?<\/redacted_reasoning>/gi,
      ""
    );
    cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, "");
    cleanText = cleanText.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "");
    cleanText = cleanText.replace(/<thought>[\s\S]*?<\/thought>/gi, "");
    cleanText = cleanText.replace(
      /<reasoning_text>[\s\S]*?<\/reasoning_text>/gi,
      ""
    );

    // Clean up extra whitespace
    cleanText = cleanText.trim();

    return {
      content: cleanText,
    };
  },
});
