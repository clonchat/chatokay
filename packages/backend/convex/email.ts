import { v } from "convex/values";
import { internalAction } from "./_generated/server.js";
import { Resend } from "resend";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Initialize Resend with API key from environment
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  return new Resend(apiKey);
};

// Email template for appointment notifications
const getEmailTemplate = (params: {
  customerName: string;
  businessName: string;
  serviceName: string;
  appointmentTime: string;
  actionType: "confirmed" | "cancelled" | "rescheduled";
  ownerNote?: string;
  chatbotUrl: string;
  rescheduledFrom?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  cancellationToken?: string;
}) => {
  const {
    customerName,
    businessName,
    serviceName,
    appointmentTime,
    actionType,
    ownerNote,
    chatbotUrl,
    rescheduledFrom,
    logoUrl,
    phone,
    email,
    cancellationToken,
  } = params;

  // Format date and time
  const aptDate = new Date(appointmentTime);
  const formattedDate = format(aptDate, "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: es,
  });
  const formattedTime = format(aptDate, "HH:mm", { locale: es });

  // Action-specific content with colors and icons
  let statusText = "";
  let statusColor = "";
  let statusIcon = "";
  let actionMessage = "";

  switch (actionType) {
    case "confirmed":
      statusText = "Confirmada";
      statusColor = "#16A34A"; // Green
      statusIcon = "✓";
      actionMessage = "Tu cita ha sido confirmada";
      break;
    case "cancelled":
      statusText = "Cancelada";
      statusColor = "#DC2626"; // Red
      statusIcon = "✗";
      actionMessage = "Tu cita ha sido cancelada";
      break;
    case "rescheduled":
      statusText = "Reprogramada";
      statusColor = "#EAB308"; // Yellow/Amber
      statusIcon = "🕐";
      actionMessage = "Tu cita ha sido reprogramada";
      break;
  }

  const rescheduledInfo = rescheduledFrom
    ? `
    <div style="background-color: #F3F4F6; border-left: 4px solid #6B7280; padding: 12px; margin: 16px 0; border-radius: 4px;">
      <p style="margin: 0; color: #374151; font-size: 14px;">
        <strong>Hora original:</strong> ${format(new Date(rescheduledFrom), "EEEE, d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
      </p>
    </div>
    `
    : "";

  const ownerNoteSection = ownerNote
    ? `
    <div style="margin-top: 20px; padding: 16px; background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">
      <h3 style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: 600;">Nota del propietario:</h3>
      <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.5;">${ownerNote}</p>
    </div>
    `
    : "";

  // Contact section for footer
  const phoneSection = phone
    ? `
      <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 14px;">
        📞 <a href="tel:${phone}" style="color: #374151; text-decoration: none;">${phone}</a>
      </p>
    `
    : "";

  const emailSection = email
    ? `
      <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 14px;">
        ✉️ <a href="mailto:${email}" style="color: #374151; text-decoration: none;">${email}</a>
      </p>
    `
    : "";

  // Logo section for header
  const logoSection = logoUrl
    ? `
      <img src="${logoUrl}" alt="${businessName}" style="height: 48px; width: auto; object-fit: contain; margin-bottom: 12px;" />
    `
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header with Logo and Business Name -->
    <div style="background-color: #F3F4F6; padding: 32px 24px; text-align: center; border-bottom: 2px solid #E5E7EB;">
      ${logoSection}
      <h1 style="margin: 0; color: #111827; font-size: 28px; font-weight: bold;">${businessName}</h1>
      <div style="margin-top: 16px; display: inline-block; background-color: ${statusColor}; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
        ${statusIcon} ${statusText}
      </div>
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px;">
      <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 600;">${actionMessage}</h2>
      
      <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px; line-height: 1.5;">
        Hola ${customerName},
      </p>

      <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px; line-height: 1.5;">
        ${
          actionType === "cancelled"
            ? "Lamentamos informarte que tu cita ha sido cancelada."
            : actionType === "rescheduled"
              ? "Tu cita ha sido reprogramada a una nueva fecha y hora."
              : "¡Excelente! Tu cita ha sido confirmada."
        }
      </p>

      ${rescheduledInfo}

      <!-- Appointment Details -->
      <div style="background-color: #F9FAFB; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #E5E7EB;">
        <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 600;">Detalles de la cita</h3>
        
        <div style="margin-bottom: 12px;">
          <div style="color: #6B7280; font-size: 14px; margin-bottom: 4px;">Servicio</div>
          <div style="color: #111827; font-size: 16px; font-weight: 500;">${serviceName}</div>
        </div>

        ${
          actionType !== "cancelled"
            ? `
        <div style="margin-bottom: 12px;">
          <div style="color: #6B7280; font-size: 14px; margin-bottom: 4px;">Fecha</div>
          <div style="color: #111827; font-size: 16px; font-weight: 500; text-transform: capitalize;">${formattedDate}</div>
        </div>

        <div>
          <div style="color: #6B7280; font-size: 14px; margin-bottom: 4px;">Hora</div>
          <div style="color: #111827; font-size: 16px; font-weight: 500;">${formattedTime}</div>
        </div>
        `
            : ""
        }
      </div>

      ${ownerNoteSection}

      ${
        actionType !== "cancelled" && cancellationToken
          ? `
      <!-- Cancel Appointment Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://chatokay.com/cancel-appointment?token=${cancellationToken}" style="display: inline-block; background-color: #1F2937; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Cancelar mi cita
        </a>
      </div>
      `
          : ""
      }

      <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 14px; line-height: 1.5;">
        Si tienes alguna pregunta, puedes contactarnos a través de nuestro chatbot o responder a este correo.
      </p>
    </div>

    <!-- Footer with Contact Info -->
    <div style="background-color: #F9FAFB; padding: 24px; text-align: center; border-top: 1px solid #E5E7EB;">
      <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px;">
        ${businessName}
      </p>
      ${phoneSection}
      ${emailSection}
      <p style="margin: 8px 0 0 0; color: #9CA3AF; font-size: 12px;">
        Powered by ChatOkay
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

// Action to send appointment notification email
export const sendAppointmentEmail = internalAction({
  args: {
    customerEmail: v.string(),
    customerName: v.string(),
    businessName: v.string(),
    subdomain: v.string(),
    serviceName: v.string(),
    appointmentTime: v.string(),
    actionType: v.union(
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("rescheduled")
    ),
    ownerNote: v.optional(v.string()),
    rescheduledFrom: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    cancellationToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const resend = getResendClient();

      // Build chatbot URL
      const chatbotUrl = `https://${args.subdomain}.chatokay.com`;

      // Generate email subject based on action
      let subject = "";
      switch (args.actionType) {
        case "confirmed":
          subject = `✓ Cita confirmada - ${args.businessName}`;
          break;
        case "cancelled":
          subject = `✗ Cita cancelada - ${args.businessName}`;
          break;
        case "rescheduled":
          subject = `↻ Cita reprogramada - ${args.businessName}`;
          break;
      }

      // Generate HTML email content
      const html = getEmailTemplate({
        customerName: args.customerName,
        businessName: args.businessName,
        serviceName: args.serviceName,
        appointmentTime: args.appointmentTime,
        actionType: args.actionType,
        ownerNote: args.ownerNote,
        chatbotUrl,
        rescheduledFrom: args.rescheduledFrom,
        logoUrl: args.logoUrl,
        phone: args.phone,
        email: args.email,
        cancellationToken: args.cancellationToken,
      });

      // Send email
      const result = await resend.emails.send({
        from: "ChatOkay <notificaciones@chatokay.com>",
        to: args.customerEmail,
        subject,
        html,
      });

      console.log("Email sent successfully:", result);
      return { success: true, emailId: result.data?.id };
    } catch (error) {
      console.error("Error sending email:", error);
      // Don't throw error - we don't want email failures to break the appointment flow
      return { success: false, error: String(error) };
    }
  },
});
