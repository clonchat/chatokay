import { action } from "./_generated/server.js";
import { v } from "convex/values";
import { api } from "./_generated/api.js";
import { createGroq } from "@ai-sdk/groq";
import { generateText, type CoreMessage } from "ai";
import { z } from "zod";
import type { Id } from "./_generated/dataModel.js";

/**
 * Initialize Groq AI provider
 * Using Groq for fast inference with Llama models
 */
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Schema for get_available_slots tool parameters
 * Validates date format and provides clear description for the AI
 */
const getAvailableSlotsSchema = z.object({
  date: z
    .string()
    .describe(
      "Fecha en formato YYYY-MM-DD. Por ejemplo: 2025-01-15. " +
        "Calcula la fecha correcta basándote en el día mencionado por el usuario."
    ),
});

/**
 * Schema for create_appointment tool parameters
 * Validates all required and optional fields for creating an appointment
 */
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

// Type helpers for clean type inference throughout the code
type GetAvailableSlotsParams = z.infer<typeof getAvailableSlotsSchema>;
type CreateAppointmentParams = z.infer<typeof createAppointmentSchema>;

/**
 * Chat action that handles customer messages and executes AI responses with tool calling
 * Supports multi-step conversations with automatic tool execution
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

    // Generate contextual information for the AI
    const currentDate = new Date().toISOString().split("T")[0] ?? "";
    const currentDay =
      new Date().toLocaleDateString("es-ES", {
        weekday: "long",
      }) ?? "Unknown";

    // Build comprehensive system prompt with business context
    const systemPrompt = buildSystemPrompt(
      { name: business.name, description: business.description },
      currentDate,
      currentDay
    );

    // Prepare message history for the AI model
    const messages = prepareMessages(systemPrompt, args.messages);

    // Define available tools for the AI agent
    const tools = defineTools(ctx, args.subdomain, business._id);

    // Generate AI response with automatic tool calling
    console.log("[Chat] Calling AI model with tools");
    const aiResponse = await generateAIResponse(messages, tools);

    console.log("[Chat] AI response received", {
      finishReason: aiResponse.finishReason,
      toolCalls: aiResponse.toolCalls?.length || 0,
      text: aiResponse.text,
      hasText: !!aiResponse.text,
    });

    // Handle tool-calls finish reason: SDK v6 beta returns finishReason: 'tool-calls' when tools are called
    if (
      aiResponse.finishReason === "tool-calls" &&
      !aiResponse.text &&
      aiResponse.toolCalls &&
      aiResponse.toolCalls.length > 0
    ) {
      console.log(
        "[Chat] Handling tool-calls finish reason, processing with agent-like behavior"
      );

      // Execute tools to get results
      const toolResults: any[] = [];
      for (const toolCall of aiResponse.toolCalls) {
        const toolName = toolCall.toolName as keyof typeof tools;
        const tool = tools[toolName];
        if (tool && tool.execute) {
          try {
            // Get args safely, handling both typed and dynamic tool calls
            const args =
              (toolCall as any).args || (toolCall as any).parameters || {};
            const result = await tool.execute(args);
            toolResults.push({ toolName, result });
            console.log(`[Chat] Tool ${toolName} executed, result:`, result);
          } catch (error) {
            console.error(`[Chat] Error executing tool ${toolName}:`, error);
            toolResults.push({ toolName, result: { error: String(error) } });
          }
        }
      }

      // Add tool results to messages in the format expected by the model
      const updatedMessages: CoreMessage[] = [
        ...messages,
        ...aiResponse.toolCalls.map((tc) => ({
          role: "assistant" as const,
          content: `Used tool: ${tc.toolName}`,
        })),
      ];

      // Add tool results as structured content
      for (const tr of toolResults) {
        updatedMessages.push({
          role: "user" as const,
          content: `Resultado de ${tr.toolName}: ${JSON.stringify(tr.result)}`,
        });
      }

      // Add instruction to provide the response
      updatedMessages.push({
        role: "user" as const,
        content:
          "Ahora proporciona una respuesta completa y amigable con la información obtenida.",
      });

      // Generate final response
      console.log("[Chat] Generating final response with tool results");
      const finalResponse = await generateAIResponse(updatedMessages, tools);

      return {
        content:
          finalResponse.text ||
          "Lo siento, no pude procesar tu solicitud correctamente.",
      };
    }

    return { content: aiResponse.text || "" };
  },
});

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
  
  Responde en español de forma natural y conversacional.`;
}

/**
 * Prepares messages for the AI model including system prompt
 */
function prepareMessages(
  systemPrompt: string,
  userMessages: Array<{ role: string; content: string }>
): CoreMessage[] {
  return [
    { role: "system", content: systemPrompt },
    ...userMessages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];
}

/**
 * Defines all available tools for the AI agent
 * Uses Vercel AI SDK v6 tool pattern
 */
function defineTools(ctx: any, subdomain: string, businessId: any) {
  return {
    get_services: {
      description:
        "Obtiene la lista completa de servicios que ofrece el negocio. " +
        "Usa esta herramienta cuando el cliente pregunte qué servicios están disponibles.",
      parameters: z.object({}),
      execute: async () => {
        console.log("[Tool] get_services called");
        const businessData = await ctx.runQuery(api.businesses.getBySubdomain, {
          subdomain,
        });
        const result = {
          services: businessData?.services || [],
          businessName: businessData?.name,
        };
        console.log("[Tool] get_services result:", JSON.stringify(result));
        return result;
      },
    },

    get_available_slots: {
      description:
        "Consulta los horarios disponibles para una fecha específica. " +
        "Retorna una lista de slots de tiempo disponibles para ese día.",
      parameters: getAvailableSlotsSchema,
      execute: async ({ date }: GetAvailableSlotsParams) => {
        console.log("[Tool] get_available_slots called", { date });
        const slots = await ctx.runQuery(api.appointments.getAvailableSlots, {
          businessId,
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
      parameters: createAppointmentSchema,
      execute: async (params: CreateAppointmentParams) => {
        console.log("[Tool] create_appointment called", { params });
        const appointmentId = await ctx.runMutation(
          api.appointments.createAppointment,
          {
            businessId,
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
      },
    },
  };
}

/**
 * Generates AI response using Groq with automatic tool calling support
 * Vercel AI SDK v6 handles tool execution automatically
 */
async function generateAIResponse(messages: CoreMessage[], tools: any) {
  return await generateText({
    model: groq("llama-3.3-70b-versatile"),
    messages,
    tools,
    temperature: 0.7,
  });
}
