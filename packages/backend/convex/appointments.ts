import { v } from "convex/values";
import {
  mutation,
  query,
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server.js";
import { internal } from "./_generated/api.js";

// Helper function to generate individual time slots
function generateTimeSlots(
  start: string,
  end: string,
  intervalMinutes: number = 30
): string[] {
  const slots: string[] = [];
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);

  const startTime = (startHour ?? 0) * 60 + (startMinute ?? 0);
  const endTime = (endHour ?? 0) * 60 + (endMinute ?? 0);

  for (let time = startTime; time < endTime; time += intervalMinutes) {
    const hour = Math.floor(time / 60);
    const minute = time % 60;
    const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    slots.push(timeStr);
  }

  return slots;
}

// Helper function to check if a time slot conflicts with an appointment
function hasTimeConflict(
  slotStart: string,
  date: string,
  appointments: Array<{
    appointmentTime: string;
    serviceName: string;
    status: string;
  }>,
  services: Array<{ name: string; duration: number }>
): boolean {
  const slotDateTime = new Date(`${date}T${slotStart}`);
  const slotStartTime = slotDateTime.getTime();

  return appointments.some((apt) => {
    // Find service duration
    const service = services.find((s) => s.name === apt.serviceName);
    const duration = service?.duration || 60; // Default 60 minutes

    const aptStartTime = new Date(apt.appointmentTime).getTime();
    const aptEndTime = aptStartTime + duration * 60 * 1000; // Convert minutes to milliseconds

    // Check if slot starts within an existing appointment
    // A slot conflicts if it starts between the appointment start and end time
    return slotStartTime >= aptStartTime && slotStartTime < aptEndTime;
  });
}

// Query to get weekly availability for a range of dates
export const getWeeklyAvailability = query({
  args: {
    businessId: v.id("businesses"),
    startDate: v.string(), // Format: YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const business = await ctx.db.get(args.businessId);

    if (!business) {
      throw new Error("Business not found");
    }

    const weeklyData = [];
    const startDate = new Date(args.startDate);

    // Get all appointments for the business
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_business_id", (q) => q.eq("businessId", args.businessId))
      .collect();

    // Generate 7 days of availability
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0] ?? "";

      const dayOfWeekEnglish = currentDate.toLocaleDateString("en-US", {
        weekday: "long",
      });

      // Map English day names to Spanish
      const dayMap: Record<string, string> = {
        Monday: "Lunes",
        Tuesday: "Martes",
        Wednesday: "Miércoles",
        Thursday: "Jueves",
        Friday: "Viernes",
        Saturday: "Sábado",
        Sunday: "Domingo",
      };

      const dayOfWeekSpanish = dayMap[dayOfWeekEnglish] || dayOfWeekEnglish;

      // Find availability for this day
      const dayAvailability = business.availability.find(
        (av) => av.day.toLowerCase() === dayOfWeekSpanish.toLowerCase()
      );

      if (!dayAvailability || dayAvailability.slots.length === 0) {
        weeklyData.push({
          date: dateStr,
          dayName: dayOfWeekSpanish,
          slots: [],
        });
        continue;
      }

      // Filter appointments for this specific date and not cancelled
      const dateAppointments = appointments.filter((apt) => {
        const aptDate = apt.appointmentTime.split("T")[0];
        return aptDate === dateStr && apt.status !== "cancelled";
      });

      // Generate individual time slots from availability ranges
      const allTimeSlots: Array<{
        start: string;
        end: string;
        isBooked: boolean;
      }> = [];

      for (const availabilitySlot of dayAvailability.slots) {
        // Generate 30-minute intervals within each availability range
        const timeSlots = generateTimeSlots(
          availabilitySlot.start,
          availabilitySlot.end,
          30
        );

        // Check each time slot for conflicts
        for (const slotStart of timeSlots) {
          // Calculate slot end time (30 minutes later)
          const [hour, minute] = slotStart.split(":").map(Number);
          const endMinutes = (hour ?? 0) * 60 + (minute ?? 0) + 30;
          const endHour = Math.floor(endMinutes / 60);
          const endMinute = endMinutes % 60;
          const slotEnd = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

          // Check if this slot conflicts with any existing appointment
          const isBooked = hasTimeConflict(
            slotStart,
            dateStr,
            dateAppointments.map((apt) => ({
              appointmentTime: apt.appointmentTime,
              serviceName: apt.serviceName,
              status: apt.status,
            })),
            business.appointmentConfig.services
          );

          allTimeSlots.push({
            start: slotStart,
            end: slotEnd,
            isBooked,
          });
        }
      }

      weeklyData.push({
        date: dateStr,
        dayName: dayOfWeekSpanish,
        slots: allTimeSlots,
      });
    }

    return weeklyData;
  },
});

// Query to get available slots for a specific date
export const getAvailableSlots = query({
  args: {
    businessId: v.id("businesses"),
    date: v.string(), // Format: YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const business = await ctx.db.get(args.businessId);

    if (!business) {
      throw new Error("Business not found");
    }

    // Get day of week from date
    const dateObj = new Date(args.date);
    const dayOfWeekEnglish = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
    });

    // Map English day names to Spanish
    const dayMap: Record<string, string> = {
      Monday: "Lunes",
      Tuesday: "Martes",
      Wednesday: "Miércoles",
      Thursday: "Jueves",
      Friday: "Viernes",
      Saturday: "Sábado",
      Sunday: "Domingo",
    };

    const dayOfWeekSpanish = dayMap[dayOfWeekEnglish] || dayOfWeekEnglish;

    // Find availability for this day
    const dayAvailability = business.availability.find(
      (av) => av.day.toLowerCase() === dayOfWeekSpanish.toLowerCase()
    );

    if (!dayAvailability || dayAvailability.slots.length === 0) {
      return [];
    }

    // Get all appointments for this date
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_business_id", (q) => q.eq("businessId", args.businessId))
      .collect();

    // Filter appointments for this specific date and not cancelled
    const dateAppointments = appointments.filter((apt) => {
      const aptDate = apt.appointmentTime.split("T")[0];
      return aptDate === args.date && apt.status !== "cancelled";
    });

    // Generate individual time slots from availability ranges
    const allTimeSlots: Array<{
      start: string;
      end: string;
      isBooked: boolean;
    }> = [];

    for (const availabilitySlot of dayAvailability.slots) {
      // Generate 30-minute intervals within each availability range
      const timeSlots = generateTimeSlots(
        availabilitySlot.start,
        availabilitySlot.end,
        30
      );

      // Check each time slot for conflicts
      for (const slotStart of timeSlots) {
        // Calculate slot end time (30 minutes later)
        const [hour, minute] = slotStart.split(":").map(Number);
        const endMinutes = (hour ?? 0) * 60 + (minute ?? 0) + 30;
        const endHour = Math.floor(endMinutes / 60);
        const endMinute = endMinutes % 60;
        const slotEnd = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

        // Check if this slot conflicts with any existing appointment
        const isBooked = hasTimeConflict(
          slotStart,
          args.date,
          dateAppointments,
          business.appointmentConfig.services
        );

        allTimeSlots.push({
          start: slotStart,
          end: slotEnd,
          isBooked,
        });
      }
    }

    return allTimeSlots;
  },
});

// Query to get all appointments for a business (for owner)
export const getBusinessAppointments = query({
  args: {
    businessId: v.id("businesses"),
  },
  handler: async (ctx, args) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_business_id", (q) => q.eq("businessId", args.businessId))
      .collect();

    return appointments;
  },
});

// Internal query to get appointment by ID (for actions)
export const getAppointmentById = internalQuery({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.appointmentId);
  },
});

// Query to get pending appointments for notifications
export const getPendingAppointments = query({
  args: {
    businessId: v.id("businesses"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_business_id", (q) => q.eq("businessId", args.businessId))
      .collect();

    const now = new Date();
    const nowISO = now.toISOString();

    // Filter pending appointments
    const pendingAppointments = allAppointments
      .filter(
        (apt) => apt.status === "pending" && apt.appointmentTime >= nowISO
      )
      .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))
      .slice(0, args.limit || 5)
      .map((apt) => ({
        _id: apt._id,
        customerName: apt.customerData.name,
        customerEmail: apt.customerData.email,
        customerPhone: apt.customerData.phone,
        appointmentTime: apt.appointmentTime,
        serviceName: apt.serviceName,
        status: apt.status,
        notes: apt.notes,
      }));

    return pendingAppointments;
  },
});

// Query to get upcoming appointments for a business
export const getUpcomingAppointments = query({
  args: {
    businessId: v.id("businesses"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const business = await ctx.db.get(args.businessId);

    if (!business) {
      throw new Error("Business not found");
    }

    // Get all appointments
    const allAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_business_id", (q) => q.eq("businessId", args.businessId))
      .collect();

    const now = new Date();
    const nowISO = now.toISOString();

    // Filter future appointments and sort by time
    const upcomingAppointments = allAppointments
      .filter((apt) => {
        // Only show non-cancelled appointments
        if (apt.status === "cancelled") return false;
        // Include appointments happening now or in the future
        return apt.appointmentTime >= nowISO;
      })
      .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))
      .slice(0, args.limit || 10)
      .map((apt) => {
        // Calculate end time based on service duration
        const service = business.appointmentConfig.services.find(
          (s) => s.name === apt.serviceName
        );
        const duration = service?.duration || 60; // Default 60 minutes
        const startTime = new Date(apt.appointmentTime);
        const endTime = new Date(startTime.getTime() + duration * 60000);

        // Check if appointment is currently in progress
        const isInProgress =
          startTime <= now && now <= endTime && apt.status !== "cancelled";

        return {
          _id: apt._id,
          customerName: apt.customerData.name,
          customerEmail: apt.customerData.email,
          customerPhone: apt.customerData.phone,
          appointmentTime: apt.appointmentTime,
          serviceName: apt.serviceName,
          status: apt.status,
          notes: apt.notes,
          isInProgress,
          duration,
          endTime: endTime.toISOString(),
        };
      });

    return upcomingAppointments;
  },
});

// Mutation to create a new appointment
export const createAppointment = mutation({
  args: {
    businessId: v.id("businesses"),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    appointmentTime: v.string(), // Format: YYYY-MM-DDTHH:mm
    serviceName: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const business = await ctx.db.get(args.businessId);

    if (!business) {
      throw new Error("Business not found");
    }

    // Check if the slot is available
    const [date, time] = args.appointmentTime.split("T");

    if (!date || !time) {
      throw new Error("Invalid appointment time format");
    }

    const dateObj = new Date(date);
    const dayOfWeekEnglish = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
    });

    // Map English day names to Spanish
    const dayMap: Record<string, string> = {
      Monday: "Lunes",
      Tuesday: "Martes",
      Wednesday: "Miércoles",
      Thursday: "Jueves",
      Friday: "Viernes",
      Saturday: "Sábado",
      Sunday: "Domingo",
    };

    const dayOfWeekSpanish = dayMap[dayOfWeekEnglish] || dayOfWeekEnglish;

    // Find availability for this day
    const dayAvailability = business.availability.find(
      (av) => av.day.toLowerCase() === dayOfWeekSpanish.toLowerCase()
    );

    if (!dayAvailability) {
      throw new Error("No availability for this day");
    }

    // Check if time slot exists within any available slot range
    const slotExists = dayAvailability.slots.some((slot) => {
      return time >= slot.start && time < slot.end;
    });

    if (!slotExists) {
      throw new Error("Time slot not available");
    }

    // Find the service to get its duration (case-insensitive and trimmed)
    const normalizedServiceName = args.serviceName.trim().toLowerCase();
    const service = business.appointmentConfig.services.find(
      (s) => s.name.trim().toLowerCase() === normalizedServiceName
    );

    if (!service) {
      const availableServices = business.appointmentConfig.services
        .map((s) => s.name)
        .join(", ");
      throw new Error(
        `Servicio no encontrado: "${args.serviceName}". Servicios disponibles: ${availableServices}`
      );
    }

    const serviceDuration = service.duration;

    // Check if slot conflicts with existing appointments
    const existingAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_business_id", (q) => q.eq("businessId", args.businessId))
      .collect();

    // Filter appointments for the same date
    const [newApptDate] = args.appointmentTime.split("T");
    const sameDayAppointments = existingAppointments.filter((apt) => {
      const [aptDate] = apt.appointmentTime.split("T");
      return aptDate === newApptDate && apt.status !== "cancelled";
    });

    // Calculate the requested appointment's time range
    const newStartTime = new Date(args.appointmentTime).getTime();
    const newEndTime = newStartTime + serviceDuration * 60 * 1000;

    // Check for overlapping appointments
    const hasConflict = sameDayAppointments.some((apt) => {
      const existingService = business.appointmentConfig.services.find(
        (s) => s.name === apt.serviceName
      );
      const existingDuration = existingService?.duration || 60;

      const existingStartTime = new Date(apt.appointmentTime).getTime();
      const existingEndTime = existingStartTime + existingDuration * 60 * 1000;

      // Check if appointments overlap
      // Two appointments overlap if:
      // - New appointment starts before existing ends AND new ends after existing starts
      return newStartTime < existingEndTime && newEndTime > existingStartTime;
    });

    if (hasConflict) {
      throw new Error("This time slot conflicts with an existing appointment");
    }

    // Create the appointment
    const appointmentId = await ctx.db.insert("appointments", {
      businessId: args.businessId,
      customerData: {
        name: args.customerName,
        email: args.customerEmail,
        phone: args.customerPhone,
      },
      appointmentTime: args.appointmentTime,
      serviceName: args.serviceName,
      status: "pending",
      notes: args.notes,
    });

    return appointmentId;
  },
});

// Internal mutation to cancel an appointment (called from action)
export const cancelAppointmentMutation = internalMutation({
  args: {
    appointmentId: v.id("appointments"),
    ownerNote: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; appointment: any }> => {
    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
      ownerNote: args.ownerNote,
    });

    return { success: true, appointment };
  },
});

// Action to cancel an appointment and send email
export const cancelAppointment = action({
  args: {
    appointmentId: v.id("appointments"),
    ownerNote: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; appointment: any }> => {
    // Get appointment details before cancelling
    const appointment = await ctx.runQuery(
      internal.appointments.getAppointmentById,
      {
        appointmentId: args.appointmentId,
      }
    );

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Get business details
    const business = await ctx.runQuery(internal.businesses.getBusinessById, {
      businessId: appointment.businessId,
    });

    if (!business) {
      throw new Error("Business not found");
    }

    // Cancel the appointment
    const result: { success: boolean; appointment: any } =
      await ctx.runMutation(internal.appointments.cancelAppointmentMutation, {
        appointmentId: args.appointmentId,
        ownerNote: args.ownerNote,
      });

    // Send email if customer has email
    if (appointment.customerData.email) {
      // Get logo URL if it exists
      let logoUrl: string | undefined;
      if (business.visualConfig?.logoUrl) {
        try {
          logoUrl =
            (await ctx.storage.getUrl(business.visualConfig.logoUrl)) ??
            undefined;
        } catch (error) {
          console.error("Error getting logo URL:", error);
        }
      }

      await ctx.runAction(internal.email.sendAppointmentEmail, {
        customerEmail: appointment.customerData.email,
        customerName: appointment.customerData.name,
        businessName: business.name,
        subdomain: business.subdomain,
        serviceName: appointment.serviceName,
        appointmentTime: appointment.appointmentTime,
        actionType: "cancelled" as const,
        ownerNote: args.ownerNote,
        logoUrl,
        phone: business.phone,
        cancellationToken: appointment.cancellationToken,
      });
    }

    return result;
  },
});

// Internal mutation to confirm an appointment (called from action)
export const confirmAppointmentMutation = internalMutation({
  args: {
    appointmentId: v.id("appointments"),
    ownerNote: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; appointment: any }> => {
    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    await ctx.db.patch(args.appointmentId, {
      status: "confirmed",
      ownerNote: args.ownerNote,
    });

    return { success: true, appointment };
  },
});

// Action to confirm an appointment and send email
export const confirmAppointment = action({
  args: {
    appointmentId: v.id("appointments"),
    ownerNote: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; appointment: any }> => {
    // Get appointment details before confirming
    const appointment = await ctx.runQuery(
      internal.appointments.getAppointmentById,
      {
        appointmentId: args.appointmentId,
      }
    );

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Get business details
    const business = await ctx.runQuery(internal.businesses.getBusinessById, {
      businessId: appointment.businessId,
    });

    if (!business) {
      throw new Error("Business not found");
    }

    // Confirm the appointment
    const result: { success: boolean; appointment: any } =
      await ctx.runMutation(internal.appointments.confirmAppointmentMutation, {
        appointmentId: args.appointmentId,
        ownerNote: args.ownerNote,
      });

    // Send email if customer has email
    if (appointment.customerData.email) {
      // Get logo URL if it exists
      let logoUrl: string | undefined;
      if (business.visualConfig?.logoUrl) {
        try {
          logoUrl =
            (await ctx.storage.getUrl(business.visualConfig.logoUrl)) ??
            undefined;
        } catch (error) {
          console.error("Error getting logo URL:", error);
        }
      }

      await ctx.runAction(internal.email.sendAppointmentEmail, {
        customerEmail: appointment.customerData.email,
        customerName: appointment.customerData.name,
        businessName: business.name,
        subdomain: business.subdomain,
        serviceName: appointment.serviceName,
        appointmentTime: appointment.appointmentTime,
        actionType: "confirmed" as const,
        ownerNote: args.ownerNote,
        logoUrl,
        phone: business.phone,
        cancellationToken: appointment.cancellationToken,
      });
    }

    return result;
  },
});

// Internal mutation to reschedule an appointment (called from action)
export const rescheduleAppointmentMutation = internalMutation({
  args: {
    appointmentId: v.id("appointments"),
    newAppointmentTime: v.string(),
    ownerNote: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; appointment: any }> => {
    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    const business = await ctx.db.get(appointment.businessId);

    if (!business) {
      throw new Error("Business not found");
    }

    // Validate new time slot availability
    const [date, time] = args.newAppointmentTime.split("T");

    if (!date || !time) {
      throw new Error("Invalid appointment time format");
    }

    const dateObj = new Date(date);
    const dayOfWeekEnglish = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
    });

    // Map English day names to Spanish
    const dayMap: Record<string, string> = {
      Monday: "Lunes",
      Tuesday: "Martes",
      Wednesday: "Miércoles",
      Thursday: "Jueves",
      Friday: "Viernes",
      Saturday: "Sábado",
      Sunday: "Domingo",
    };

    const dayOfWeekSpanish = dayMap[dayOfWeekEnglish] || dayOfWeekEnglish;

    // Find availability for this day
    const dayAvailability = business.availability.find(
      (av) => av.day.toLowerCase() === dayOfWeekSpanish.toLowerCase()
    );

    if (!dayAvailability) {
      throw new Error("No availability for this day");
    }

    // Check if time slot exists within any available slot range
    const slotExists = dayAvailability.slots.some((slot) => {
      return time >= slot.start && time < slot.end;
    });

    if (!slotExists) {
      throw new Error("Time slot not available");
    }

    // Find the service to get its duration
    const service = business.appointmentConfig.services.find(
      (s) => s.name === appointment.serviceName
    );

    if (!service) {
      throw new Error("Service not found");
    }

    const serviceDuration = service.duration;

    // Check if slot conflicts with existing appointments (excluding current one)
    const existingAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_business_id", (q) =>
        q.eq("businessId", appointment.businessId)
      )
      .collect();

    // Filter appointments for the same date (excluding the current appointment being rescheduled)
    const [newApptDate] = args.newAppointmentTime.split("T");
    const sameDayAppointments = existingAppointments.filter((apt) => {
      const [aptDate] = apt.appointmentTime.split("T");
      return (
        aptDate === newApptDate &&
        apt.status !== "cancelled" &&
        apt._id !== args.appointmentId
      );
    });

    // Calculate the requested appointment's time range
    const newStartTime = new Date(args.newAppointmentTime).getTime();
    const newEndTime = newStartTime + serviceDuration * 60 * 1000;

    // Check for overlapping appointments
    const hasConflict = sameDayAppointments.some((apt) => {
      const existingService = business.appointmentConfig.services.find(
        (s) => s.name === apt.serviceName
      );
      const existingDuration = existingService?.duration || 60;

      const existingStartTime = new Date(apt.appointmentTime).getTime();
      const existingEndTime = existingStartTime + existingDuration * 60 * 1000;

      // Check if appointments overlap
      return newStartTime < existingEndTime && newEndTime > existingStartTime;
    });

    if (hasConflict) {
      throw new Error("This time slot conflicts with an existing appointment");
    }

    // Update the appointment
    await ctx.db.patch(args.appointmentId, {
      rescheduledFrom: appointment.appointmentTime,
      appointmentTime: args.newAppointmentTime,
      ownerNote: args.ownerNote,
      status: "confirmed", // Auto-confirm when rescheduled by owner
    });

    return { success: true, appointment };
  },
});

// Action to reschedule an appointment and send email
export const rescheduleAppointment = action({
  args: {
    appointmentId: v.id("appointments"),
    newAppointmentTime: v.string(), // Format: YYYY-MM-DDTHH:mm
    ownerNote: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; appointment: any }> => {
    // Get appointment details before rescheduling
    const appointment = await ctx.runQuery(
      internal.appointments.getAppointmentById,
      {
        appointmentId: args.appointmentId,
      }
    );

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Get business details
    const business = await ctx.runQuery(internal.businesses.getBusinessById, {
      businessId: appointment.businessId,
    });

    if (!business) {
      throw new Error("Business not found");
    }

    // Store original time for email
    const originalTime = appointment.appointmentTime;

    // Reschedule the appointment
    const result: { success: boolean; appointment: any } =
      await ctx.runMutation(
        internal.appointments.rescheduleAppointmentMutation,
        {
          appointmentId: args.appointmentId,
          newAppointmentTime: args.newAppointmentTime,
          ownerNote: args.ownerNote,
        }
      );

    // Send email if customer has email
    if (appointment.customerData.email) {
      // Get logo URL if it exists
      let logoUrl: string | undefined;
      if (business.visualConfig?.logoUrl) {
        try {
          logoUrl =
            (await ctx.storage.getUrl(business.visualConfig.logoUrl)) ??
            undefined;
        } catch (error) {
          console.error("Error getting logo URL:", error);
        }
      }

      await ctx.runAction(internal.email.sendAppointmentEmail, {
        customerEmail: appointment.customerData.email,
        customerName: appointment.customerData.name,
        businessName: business.name,
        subdomain: business.subdomain,
        serviceName: appointment.serviceName,
        appointmentTime: args.newAppointmentTime,
        actionType: "rescheduled" as const,
        ownerNote: args.ownerNote,
        rescheduledFrom: originalTime,
        logoUrl,
        phone: business.phone,
        cancellationToken: appointment.cancellationToken,
      });
    }

    return result;
  },
});
