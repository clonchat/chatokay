¡Perfecto! Tener la estructura base y las credenciales listas es un gran avance. Ahora podemos trazar un plan de acción claro y conciso, paso a paso, respetando tu estructura de monorepo con Convex en `packages/backend`.

Este plan está diseñado para ser seguido en orden, ya que cada fase construye sobre la anterior.

### **Plan de Acción para el Desarrollo de "Chatokay.com"**

#### **Fase 1: Autenticación y Sincronización de Usuarios**

**Objetivo:** Permitir que los usuarios se registren y se logueen, y que sus datos se creen automáticamente en tu base de datos de Convex.

1.  **Integrar Clerk en el Frontend:**
    - En `apps/web/app/layout.tsx`, envuelve el contenido dentro del `<body>` con el `<ClerkProvider>` de `@clerk/nextjs`. Tu `ConvexClientProvider` debería quedar dentro del `ClerkProvider`.
    - Crea el fichero `apps/web/middleware.ts` para proteger las rutas de tu aplicación. Usa la plantilla estándar de Clerk para esto, definiendo qué rutas son públicas (ej. la landing page) y cuáles son privadas (el dashboard).

2.  **Definir el Esquema de Usuario en Convex: (está ya)**
    - Abre `packages/backend/schema.ts`.
    - Define la tabla `users` con los campos necesarios, incluyendo el `clerkId` que será el identificador único para la sincronización.

      ```typescript
      // packages/backend/schema.ts
      import { defineSchema, defineTable } from "convex/server";
      import { v } from "convex/values";

      export default defineSchema({
        users: defineTable({
          email: v.string(),
          name: v.optional(v.string()),
          clerkId: v.string(),
        }).index("by_clerk_id", ["clerkId"]),

        // (Dejaremos las otras tablas para la siguiente fase)
      });
      ```

3.  **Crear el Webhook de Sincronización:**
    - En `packages/backend/`, crea un nuevo fichero llamado `clerk.ts`.
    - Dentro de este fichero, implementa un `httpAction` que escuche los eventos de Clerk (`user.created`, `user.updated`).
    - Esta acción debe verificar la firma del webhook y luego llamar a una `internalMutation` para crear o actualizar el registro del usuario en tu tabla `users`.
      > **Prompt para Cursor:** "En `packages/backend/clerk.ts`, crea un `httpAction` que funcione como un webhook para Clerk. Debe usar `Webhook` de `svix` para la validación. Basado en el `evt.type`, debe llamar a una `internalMutation` para insertar o actualizar un usuario en la base de datos de Convex, mapeando los datos del webhook a la tabla `users`."
    - Despliega tus cambios (`npx convex deploy`) y configura la URL del endpoint HTTP en tu dashboard de Clerk en la sección "Webhooks".

---

#### **Fase 2: Modelo de Datos del Negocio y Onboarding**

**Objetivo:** Definir la estructura de datos para los negocios y crear el flujo inicial donde un nuevo usuario configura su chatbot.

1.  **Ampliar el Esquema de Convex:**
    - Vuelve a `packages/backend/schema.ts`.
    - Añade las tablas `businesses` y `appointments` tal como las definimos en la documentación anterior. Asegúrate de crear los índices (`.index()`) para `subdomain` y `userId` en la tabla `businesses`.

2.  **Crear las Mutaciones de Onboarding:**
    - En `packages/backend/`, crea un fichero `businesses.ts`.
    - Implementa una mutación `createBusiness` que reciba el nombre, la descripción y el subdominio. Esta mutación debe:
      - Verificar que el usuario autenticado no tenga ya un negocio.
      - Verificar que el subdominio no esté en uso.
      - Crear el registro del negocio en la base de datos, asociándolo al `userId`.

3.  **Construir la UI del Onboarding:**
    - En `apps/web`, crea una ruta protegida `/onboarding`.
    - Diseña un formulario simple con los campos: Nombre del Negocio, Descripción y Subdominio.
    - Usa el hook `useMutation` de `convex/react` para llamar a tu mutación `createBusiness`.
    - Tras una creación exitosa, usa el `router` de Next.js para redirigir al usuario a su nuevo dashboard (`/dashboard`).

---

#### **Fase 3: Construcción del Dashboard Principal**

**Objetivo:** Desarrollar las vistas principales que el propietario del negocio usará para gestionar sus citas y configuración.

1.  **Crear las Queries del Dashboard:**
    - En `packages/backend/businesses.ts`, crea una query `getCurrentUserBusiness` que devuelva el negocio asociado al usuario actualmente logueado.
    - En un nuevo fichero `packages/backend/appointments.ts`, crea queries para obtener las citas: `getPendingAppointments`, `getConfirmedAppointments`, etc.

2.  **Diseñar la Vista de Inicio (`/dashboard`):**
    - Usa el hook `useQuery` de `convex/react` para llamar a `getCurrentUserBusiness` y a las queries de citas.
    - Muestra las tarjetas de estadísticas ("Citas Pendientes", "Confirmadas Hoy") con los datos obtenidos.
    - Muestra el enlace público al chatbot del usuario (ej: `[subdominio].chatokay.com`).

3.  **Implementar la Vista de Calendario (`/calendario`):**
    - Instala una librería de calendarios como `react-big-calendar`.
    - Usa `useQuery` para obtener todas las citas del negocio.
    - Mapea los datos de las citas al formato que espera la librería de calendarios.
    - Crea las mutaciones en Convex para `confirmAppointment` y `cancelAppointment`.
    - Haz que al hacer clic en un evento del calendario se abra un modal (usando Radix UI) con los detalles y los botones para confirmar o cancelar la cita, los cuales llamarán a estas mutaciones.

4.  **Implementar las Páginas de Configuración (`/servicios`, `/horarios`):**
    - Crea primero las mutaciones en Convex (`updateServices`, `updateAvailability`).
    - Luego, construye las interfaces de usuario que permitan al propietario editar su lista de servicios y su disponibilidad semanal. Estos formularios llamarán a las mutaciones correspondientes al guardarse.

---

#### **Fase 4: El Chatbot y la Lógica de IA**

**Objetivo:** Poner en marcha la aplicación `chatbot` y dotarla de inteligencia para agendar citas.

1.  **Crear la Aplicación `chatbot`:**
    - Si no lo has hecho, crea la segunda aplicación Next.js en `apps/chatbot`.
    - Esta aplicación será muy ligera. Su objetivo principal es renderizar la interfaz de chat.

2.  **Implementar la API de Chat (`/api/chat`):**
    - Dentro de `apps/chatbot`, crea la ruta de API `app/api/chat/route.ts`.
    - Configura la **Vercel AI SDK** para que use **Groq**.
    - Define las `tools` que el LLM podrá usar: `getServices`, `getAvailability`, `scheduleAppointment`.
    - **Importante:** Estas `tools` internamente usarán `ConvexHttpClient` para llamar a las queries y mutaciones que ya has creado en `packages/backend`. Este es el poder del monorepo.

3.  **Construir la UI del Chat:**
    - En la página principal de `apps/chatbot`, usa el hook `useChat` de la AI SDK para crear la interfaz.
    - La app necesitará saber para qué negocio es. Deberás obtener el subdominio desde el `hostname` y pasarlo en el `body` de la petición a tu API de chat.

---

#### **Fase 5: Integraciones con Google**

**Objetivo:** Activar la sincronización con Google Calendar para los usuarios que lo autoricen.

1.  **Crear el Componente de Conexión:**
    - En la app `dashboard` (por ejemplo, en una página `/settings`), crea el componente `GoogleConnectButton` que discutimos.
    - Usa `useUser` de Clerk para comprobar si la cuenta de Google ya está vinculada y para llamar a `user.createExternalAccount()` si no lo está.

2.  **Crear la Acción de Convex para Google Calendar:**
    - En `packages/backend/`, crea un fichero `googleCalendar.ts`.
    - Implementa una `action` que reciba los detalles de una cita y el `clerkId` del propietario.
    - Esta `action` usará la API de backend de Clerk para obtener el `accessToken` de OAuth del usuario.
    - Con el token, usará la API de Google Calendar para crear el evento.

3.  **Disparar la Acción:**
    - Modifica tu mutación `confirmAppointment` en `packages/backend/appointments.ts`.
    - Después de actualizar el estado de la cita en la base de datos, añade una línea para agendar la ejecución de tu nueva acción de Google Calendar: `ctx.scheduler.runAfter(0, api.googleCalendar.createCalendarEvent, { ... })`.

Siguiendo este plan, irás construyendo la aplicación de forma lógica y ordenada, desde la base hasta las características más complejas. ¡Adelante
