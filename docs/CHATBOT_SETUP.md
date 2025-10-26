# Chatbot AI Agent Setup

Este documento describe cómo configurar y usar el agente de IA del chatbot.

## Arquitectura

El chatbot utiliza:

- **Backend**: Convex Actions con `@ai-sdk/groq` y `ai` SDK
- **Modelo**: Llama 3.3 70B Versatile (via Groq)
- **Streaming**: Respuestas en tiempo real usando Vercel AI SDK
- **Function Calling**: Herramientas para consultar servicios, disponibilidad y crear citas

## Configuración

### 1. Variable de entorno en Convex

Necesitas configurar la API key de Groq en el dashboard de Convex:

1. Ve a https://dashboard.convex.dev
2. Selecciona tu proyecto
3. Ve a Settings > Environment Variables
4. Agrega:
   ```
   GROQ_API_KEY=tu_groq_api_key
   ```

Para obtener una API key de Groq:

1. Ve a https://console.groq.com
2. Crea una cuenta o inicia sesión
3. Ve a API Keys y crea una nueva

### 2. Deploy del backend

```bash
cd packages/backend
pnpm run deploy
```

## Capacidades del Agente

El agente puede:

### 1. Consultar servicios

- **Tool**: `get_services`
- **Uso**: El cliente pregunta "¿Qué servicios ofrecen?"
- **Acción**: Consulta la lista de servicios del negocio

### 2. Ver disponibilidad

- **Tool**: `get_available_slots`
- **Uso**: El cliente pregunta "¿Tienen disponibilidad el miércoles?"
- **Acción**: Consulta los horarios disponibles para la fecha especificada
- **Inteligente**: Convierte días de la semana a fechas exactas

### 3. Crear citas

- **Tool**: `create_appointment`
- **Uso**: Después de recopilar todos los datos necesarios
- **Datos requeridos**:
  - Nombre del cliente
  - Servicio deseado
  - Fecha y hora
- **Datos opcionales**:
  - Email
  - Teléfono
  - Notas

## Flujo de conversación típico

```
Cliente: Hola, ¿qué servicios ofrecen?
Bot: [Llama a get_services] Ofrecemos: masaje terapéutico, masaje relajante...

Cliente: Me interesa el masaje terapéutico, ¿tienen disponibilidad el miércoles?
Bot: [Llama a get_available_slots con fecha calculada] Sí, tenemos disponible a las 10:00, 14:00...

Cliente: Perfecto, quiero reservar a las 10:00
Bot: Perfecto, necesito tu nombre para confirmar la cita.

Cliente: Juan Pérez
Bot: ¿Me puedes proporcionar tu email y teléfono para enviarte la confirmación?

Cliente: juan@example.com y 123456789
Bot: [Llama a create_appointment] ¡Cita creada! Recibirás un correo de confirmación.
```

## Características técnicas

### Streaming

Las respuestas se envían en tiempo real, palabra por palabra, para mejor UX.

### Context Awareness

- Mantiene historial de conversación
- Entiende contexto temporal (hoy, mañana, días de la semana)
- Calcula fechas automáticamente

### Error Handling

- Valida slots disponibles antes de crear citas
- Maneja errores de disponibilidad
- Proporciona mensajes claros al usuario

### Multi-step Reasoning

- Puede hacer múltiples llamadas a tools en secuencia
- Recopila información progresivamente
- Confirma antes de crear citas

## System Prompt

El agente tiene un system prompt contextual que incluye:

- Información del negocio (nombre, descripción)
- Fecha y día actual
- Instrucciones de comportamiento
- Guías para usar las herramientas

## Personalización

### Modificar el comportamiento

Edita `packages/backend/convex/chat.ts`:

```typescript
const systemPrompt = `...`; // Personaliza el prompt aquí
```

### Agregar nuevas herramientas

```typescript
const tools = {
  nueva_tool: tool({
    description: "...",
    parameters: z.object({ ... }),
    execute: async (params) => {
      // Lógica aquí
      return resultado;
    }
  })
};
```

### Cambiar modelo

```typescript
model: groq("llama-3.3-70b-versatile"), // Cambia aquí
```

Modelos disponibles en Groq:

- `llama-3.3-70b-versatile` (recomendado)
- `llama-3.1-8b-instant` (más rápido, menos capaz)
- `mixtral-8x7b-32768` (bueno para español)

## Troubleshooting

### El bot no responde

- Verifica que GROQ_API_KEY esté configurado
- Revisa los logs en Convex dashboard
- Verifica que el backend esté deployed

### Tool calls no funcionan

- Verifica que los datos del negocio estén configurados (servicios, disponibilidad)
- Revisa los logs para ver qué herramienta se está llamando

### Streaming no funciona

- Verifica la conexión de red
- Revisa la consola del navegador para errores
- Asegúrate de usar la versión correcta del SDK

## Próximas mejoras

- [ ] Soporte para cancelación/reagendación de citas
- [ ] Envío de emails de confirmación
- [ ] Recordatorios automáticos
- [ ] Soporte multilenguaje
- [ ] Analytics de conversaciones
