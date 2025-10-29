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
  - Sé amable y profesional.
  - Devuelve el texto siempre en markdown, usa emojis para facilitar la lectura.
  - Cuida la estructura y legibilidad del texto.
  - Pregunta por la información necesaria de forma natural
  - Para agendar una cita necesitas: nombre del cliente, email, teléfono (opcional), servicio, fecha y hora
  - Antes de pedir los datos, ayuda al cliente a seleccionar el servicio y la fecha y hora.
  - Cuando el usuario pregunte por servicios, SIEMPRE usa la herramienta get_services
  - Cuando el usuario pregunte por disponibilidad, SIEMPRE usa get_available_slots
  - Cuando el usuario pregunte por la próxima cita disponible o "cuándo puedo tener una cita", usa get_upcoming_appointments
  - Si no tienes información, usa las herramientas disponibles para consultarla
  
  CONTEXTO TEMPORAL:
  - Fecha de hoy: ${currentDate}
  - Día de la semana: ${currentDay}
  - Cuando el usuario mencione días como "miércoles", "jueves", etc., calcula la fecha exacta
  - Los días de la semana en español son: lunes, martes, miércoles, jueves, viernes, sábado, domingo
  
  PROCESO PARA CREAR CITAS (MUY IMPORTANTE):
  1. Primero usa get_services para obtener los nombres EXACTOS de los servicios disponibles
  2. Ayuda al cliente a elegir un servicio usando el nombre EXACTO que obtuviste de get_services
  3. Verifica disponibilidad con get_available_slots
  4. Recopila todos los datos necesarios (nombre, email, servicio EXACTO, fecha y hora)
  5. Confirma los detalles con el usuario preguntando "¿Es correcto?"
  6. SOLO cuando el usuario confirme, llama a create_appointment con el nombre EXACTO del servicio
  7. ESPERA la respuesta de create_appointment
  8. Si create_appointment retorna success:true, entonces confirma al usuario que la cita fue creada
  9. Si create_appointment retorna success:false o hay un error, informa al usuario del error específico
  
  REGLAS CRÍTICAS:
  - NUNCA digas al usuario que la cita está confirmada/agendada/creada ANTES de llamar a create_appointment
  - NUNCA digas al usuario que la cita está confirmada/agendada/creada si create_appointment no retornó success:true
  - SIEMPRE usa el nombre EXACTO del servicio tal como lo retorna get_services
  - Si create_appointment falla, explica el error al usuario y pide que verifique la información
  
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
          console.log("using get_services tool");
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
          console.log("using get_available_slots tool");
          const slots = await ctx.runQuery(api.appointments.getAvailableSlots, {
            businessId: business._id,
            date,
          });
          const dateObj = new Date(`${date}T00:00:00`);
          const dayName = dateObj.toLocaleDateString("es-ES", {
            weekday: "long",
          });
          console.log("Slots:", slots);
          console.log("Date:", date);
          console.log("Day Name:", dayName);
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
          "IMPORTANTE: Asegúrate de tener toda la información necesaria antes de llamar a esta función. " +
          "Usa el nombre EXACTO del servicio tal como lo retorna get_services. " +
          "Debes verificar el resultado de esta función antes de confirmar al usuario. " +
          "Si success es false, NO digas al usuario que la cita fue creada.",
        inputSchema: createAppointmentSchema,
        execute: async (params: CreateAppointmentParams) => {
          try {
            console.log("using create_appointment tool with params:", params);
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
            console.log("Appointment created successfully:", appointmentId);
            return {
              success: true,
              appointmentId: appointmentId.toString(),
              message:
                "¡Cita creada exitosamente! Puedes confirmar al usuario.",
              details: params,
            };
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Error desconocido al crear la cita";
            console.error("Error creating appointment:", errorMessage);
            return {
              success: false,
              error: errorMessage,
              message: `No se pudo crear la cita. Error: ${errorMessage}`,
              details: params,
            };
          }
        },
      },
      get_upcoming_appointments: {
        description:
          "Obtiene las próximas citas disponibles. " +
          "Usa esta herramienta cuando el cliente pregunte por la próxima cita disponible o cuándo puede tener una cita.",
        inputSchema: z.object({}),
        execute: async () => {
          console.log("using get_upcoming_appointments tool");
          const upcomingAppointments = await ctx.runQuery(
            api.appointments.getUpcomingAppointments,
            {
              businessId: business._id,
              limit: 10,
            }
          );
          return {
            appointments: upcomingAppointments,
            count: upcomingAppointments.length,
          };
        },
      },
    };

    // Create agent instance with tools
    const agent = new Agent(components.agent, {
      name: `Agent for ${business.name}`,
      languageModel: openrouter("google/gemini-2.0-flash-001"),
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

/**
 * Chat action for the landing page chatbot
 * Simple chatbot to answer questions about ChatOkay without requiring a business
 */
export const sendLandingMessage = action({
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
    sessionId: v.string(),
  },
  handler: async (ctx, args): Promise<{ content: string }> => {
    console.log("[Landing Chat] Starting sendLandingMessage handler");

    const systemPrompt = `Eres un asistente virtual amigable y profesional para ChatOkay, una plataforma de asistente de citas con IA para negocios.

  INFORMACIÓN SOBRE CHATOKAY:
  - ChatOkay es una plataforma que permite a los negocios automatizar la gestión de citas usando inteligencia artificial
  - Los negocios pueden crear un chatbot personalizado con subdominio propio
  - Incluye integraciones con Google Calendar, Telegram y WhatsApp
  - Los clientes pueden agendar citas 24/7 a través del chatbot
  - Los negocios tienen acceso a un dashboard completo para gestionar citas
  - Es gratuito para empezar
  - Email de contacto: chatokay.dev@gmail.com
  - Los usuarios pueden registrarse en /sign-up o iniciar sesión en /sign-in

  TU OBJETIVO:
  Responder preguntas sobre ChatOkay de manera amable, clara y concisa. 
  Si alguien pregunta sobre cómo funciona, precios, características, o cómo registrarse, proporciona información útil.

  INSTRUCCIONES:
  - Sé amable, profesional y entusiasta sobre ChatOkay
  - Devuelve el texto siempre en markdown, usa emojis moderadamente para facilitar la lectura
  - Cuida la estructura y legibilidad del texto
  - Si no sabes algo específico, invita al usuario a contactar por email: chatokay.dev@gmail.com
  - Anima a los usuarios interesados a registrarse en /sign-up
  - Sé conciso pero completo en tus respuestas

  Responde en español de forma natural y conversacional.`;

    // Convert frontend messages to format expected by Convex Agent
    const agentMessages = args.messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

    // Use the session ID to maintain conversation context
    const sessionUserId = args.sessionId;

    // Create agent instance (simpler, no tools needed for landing)
    const agent = new Agent(components.agent, {
      name: "ChatOkay Landing Agent",
      languageModel: openrouter("minimax/minimax-m2:free"),
      instructions: systemPrompt,
      maxSteps: 3,
    });

    console.log("[Landing Chat] Calling agent with session:", sessionUserId);

    const result = await agent.generateText(
      ctx,
      { userId: sessionUserId },
      {
        messages: agentMessages,
      }
    );

    console.log("[Landing Chat] Agent response received:", {
      text: result.text,
      finishReason: result.finishReason,
    });

    // Remove any reasoning tags from the response
    let cleanText =
      result.text || "Lo siento, no pude procesar tu solicitud correctamente.";

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
