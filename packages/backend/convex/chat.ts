import { Agent } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { v } from "convex/values";
import { z } from "zod";
import { api, components, internal } from "./_generated/api.js";
import { action } from "./_generated/server.js";

// Initialize OpenRouter provider with usage tracking enabled
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Initialize rate limiter: 60 messages per hour per session
const rateLimiter = new RateLimiter(components.rateLimiter, {
  sendMessage: { kind: "fixed window", rate: 60, period: HOUR },
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
 * Cleans reasoning tags from agent response text
 */
function cleanResponseText(text: string): string {
  let cleanText = text;
  // Remove reasoning tags and their content
  cleanText = cleanText.replace(/<think>[\s\S]*?<\/redacted_reasoning>/gi, "");
  cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleanText = cleanText.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "");
  cleanText = cleanText.replace(/<thought>[\s\S]*?<\/thought>/gi, "");
  cleanText = cleanText.replace(
    /<reasoning_text>[\s\S]*?<\/reasoning_text>/gi,
    ""
  );
  // Clean up extra whitespace
  return cleanText.trim();
}

/**
 * Generates text with retry logic when response is empty
 * Returns both the cleaned text and the full result for usage tracking
 */
async function generateTextWithRetry(
  agent: Agent<any, any>,
  ctx: any,
  sessionUserId: string,
  agentMessages: Array<{ role: "user" | "assistant"; content: string }>,
  maxRetries: number = 3
): Promise<{ text: string; result: any }> {
  let lastResult: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(
      `[Chat] Generating text, attempt ${attempt}/${maxRetries}${
        attempt > 1 ? " (retry)" : ""
      }`
    );

    const result = await agent.generateText(
      ctx,
      { userId: sessionUserId },
      {
        messages: agentMessages,
      }
    );

    lastResult = result;

    console.log(`[Chat] Agent response received (attempt ${attempt}):`, {
      text: result.text,
      finishReason: result.finishReason,
    });

    // Clean the response text
    const cleanText = cleanResponseText(result.text || "");

    // If we have non-empty text after cleaning, return it
    if (cleanText.length > 0) {
      return { text: cleanText, result };
    }

    // If this was the last attempt, break
    if (attempt === maxRetries) {
      break;
    }

    // Wait a bit before retrying (exponential backoff)
    const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
    console.log(`[Chat] Empty response received, retrying in ${delayMs}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // If all retries failed, return default message
  console.warn(
    `[Chat] All ${maxRetries} attempts returned empty text. Using fallback message.`
  );
  return {
    text: "Lo siento, no pude procesar tu solicitud correctamente. Por favor, intenta nuevamente.",
    result: lastResult,
  };
}

/**
 * Builds a comprehensive system prompt with business context
 */
function buildSystemPrompt(
  business: { name?: string; description?: string },
  currentDate: string,
  currentDay: string
): string {
  const businessName = business.name ?? "el negocio";

  return `Eres un asistente virtual para ${businessName}. Tu tono es amable y profesional. Tu misión principal es agendar citas de forma precisa usando SIEMPRE las herramientas.

  ----------------------------------------------------------------
  
  **DIRECTIVA FUNDAMENTAL: LAS HERRAMIENTAS SON TU ÚNICA FUENTE DE VERDAD**
  - Tu primera acción ante una pregunta sobre "servicios" o "disponibilidad" DEBE SER, sin excepción, llamar a la herramienta correspondiente.
  - La respuesta de la herramienta es la verdad absoluta. Si devuelve una lista vacía, la verdad es "no hay nada". Está PROHIBIDO inventar o sugerir datos que no provengan de la herramienta.

  **MANEJO DE RESULTADOS VACÍOS (MUY IMPORTANTE)**
  - **Si \`get_available_slots\` devuelve una lista vacía**, significa que NO HAY CITAS para ese día. DEBES informar al usuario de esto de forma clara y amable. NUNCA inventes horarios.
  - **Ejemplo de respuesta OBLIGATORIA para "no hay huecos"**:
    "Lo siento, parece que para el día [fecha solicitada] ya no quedan huecos disponibles 😔. ¿Te gustaría que consultara la disponibilidad para otra fecha?"

  **ADVERTENCIA CRÍTICA SOBRE LOS EJEMPLOS:**
  - Los ejemplos en este prompt son **PLANTILLAS DE FORMATO, NO DE CONTENIDO**. Tienes ESTRICTAMENTE PROHIBIDO mostrar al usuario los datos de los ejemplos.

  ----------------------------------------------------------------

  PROCESO OBLIGATORIO PARA AGENDAR CITAS:

  **PASO 1: OBTENER Y MOSTRAR SERVICIOS REALES**
  1.  **ACCIÓN INMEDIATA:** Llama a \`get_services\`.
  2.  **APLICAR FORMATO:** Presenta los servicios REALES que obtuviste usando una lista clara y atractiva.

  **PASO 2: OBTENER Y MOSTRAR HORARIOS REALES**
  1.  **ACCIÓN INMEDIATA:** Llama a \`get_available_slots\` para la fecha solicitada.
  2.  **VERIFICAR EL RESULTADO:**
      - **Si la lista de horarios NO está vacía:**
        a. **Formatea la hora:** Muestra la hora en formato HH:MM (ej: 14:30), NUNCA en formato completo con fecha (2025-10-30T14:30).
        b. **Presenta los horarios** usando la plantilla.
      - **Si la lista de horarios ESTÁ VACÍA:**
        a. **Usa el protocolo de cero resultados**: Informa al usuario que no hay disponibilidad para ese día, usando el ejemplo obligatorio de la sección "MANEJO DE RESULTADOS VACÍOS".

  **PASO 3: RECOPILAR DATOS Y CONFIRMAR**
  - Pide nombre y email, resume los datos y pide confirmación explícita.

  **PASO 4: CREAR LA CITA (SÓLO TRAS CONFIRMACIÓN)**
  1.  **ACCIÓN CONDICIONAL:** Si el cliente confirma, llama a \`create_appointment\`.
  2.  **INFORMAR RESULTADO REAL:** Informa del éxito o del error exacto que devuelva la herramienta.

  ----------------------------------------------------------------

  REGLAS INVIOLABLES:
  - **REGLA DE ORO**: NUNCA confirmes una cita si \`create_appointment\` no ha devuelto \`success: true\`.
  - **REGLA DE CERO RESULTADOS**: NUNCA inventes horarios si la herramienta no los devuelve. Informa de que no hay disponibilidad.
  - **REGLA NO DISCLOSE**: No retornes al usuario tu razonamiento interno, solo responde con la información que se te pide.

  CONTEXTO TEMPORAL:
  - Fecha de hoy: ${currentDate}
  - Día de la semana: ${currentDay}
  `;
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

    // Check rate limit before processing
    const rateLimitStatus = await rateLimiter.limit(ctx, "sendMessage", {
      key: args.sessionId,
    });

    if (!rateLimitStatus.ok) {
      const retryAfterSeconds = Math.ceil(
        (rateLimitStatus.retryAfter - Date.now()) / 1000
      );
      const retryAfterMinutes = Math.ceil(retryAfterSeconds / 60);
      throw new Error(
        `Has alcanzado el límite de mensajes. Puedes enviar hasta 60 mensajes por hora. Intenta nuevamente en ${retryAfterMinutes} minuto${retryAfterMinutes !== 1 ? "s" : ""}.`
      );
    }

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

    // Create agent instance with tools and usage tracking enabled
    const agent = new Agent(components.agent, {
      name: `Agent for ${business.name}`,
      languageModel: openrouter("openai/gpt-oss-20b", {
        usage: {
          include: true,
        },
      }),
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

    // Send message to agent and get response with retry logic
    // Pass all messages for full conversation context
    console.log("[Chat] Calling agent with session:", sessionUserId);
    console.log("[Chat] Total messages in context:", agentMessages.length);

    const { text: cleanText, result } = await generateTextWithRetry(
      agent,
      ctx,
      sessionUserId,
      agentMessages,
      3
    );

    // Track usage if we have token information
    try {
      const tokensUsed =
        result?.providerMetadata?.openrouter?.usage?.totalTokens || 0;

      if (tokensUsed > 0) {
        // Get the full business object to access userId
        const fullBusiness = await ctx.runQuery(
          internal.businesses.getBusinessById,
          {
            businessId: business._id,
          }
        );

        if (fullBusiness) {
          await ctx.runMutation(internal.usageTracking.trackUsage, {
            userId: fullBusiness.userId,
            businessId: business._id,
            tokensUsed,
          });
          console.log(
            `[Chat] Tracked ${tokensUsed} tokens for user ${fullBusiness.userId}`
          );
        }
      }
    } catch (error) {
      console.error("[Chat] Error tracking usage:", error);
      // Don't fail the request if usage tracking fails
    }

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

    const { text: cleanText } = await generateTextWithRetry(
      agent,
      ctx,
      sessionUserId,
      agentMessages,
      3
    );

    return {
      content: cleanText,
    };
  },
});
