import { v } from "convex/values";
import {
  mutation,
  query,
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server.js";
import { internal } from "./_generated/api.js";

// Helper function to sanitize strings for comparison (removes accents, normalizes case and whitespace)
function sanitizeString(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD") // Normalize to decomposed form
    .replace(/[\u0300-\u036f]/g, ""); // Remove combining diacritical marks (accents)
}

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
  services: Array<{ name: string; duration: number; maxPeople?: number }>
): boolean {
  const slotDateTime = new Date(`${date}T${slotStart}`);
  const slotStartTime = slotDateTime.getTime();

  // Group appointments by service to check capacity
  const serviceAppointments = new Map<
    string,
    Array<(typeof appointments)[0]>
  >();

  for (const apt of appointments) {
    const normalizedServiceName = sanitizeString(apt.serviceName);
    if (!serviceAppointments.has(normalizedServiceName)) {
      serviceAppointments.set(normalizedServiceName, []);
    }
    serviceAppointments.get(normalizedServiceName)!.push(apt);
  }

  // Check each service group for conflicts
  for (const [
    normalizedServiceName,
    serviceApts,
  ] of serviceAppointments.entries()) {
    const service = services.find(
      (s) => sanitizeString(s.name) === normalizedServiceName
    );
    const duration = service?.duration || 60; // Default 60 minutes
    const maxPeople = service?.maxPeople ?? 1; // Default to 1

    // Count overlapping appointments for this service
    const overlappingCount = serviceApts.filter((apt) => {
      const aptStartTime = new Date(apt.appointmentTime).getTime();
      const aptEndTime = aptStartTime + duration * 60 * 1000;

      // Check if slot starts within an existing appointment
      return slotStartTime >= aptStartTime && slotStartTime < aptEndTime;
    }).length;

    // For services with maxPeople = 1, any overlap means conflict
    // For services with maxPeople > 1, conflict only if capacity is reached
    if (maxPeople === 1 && overlappingCount > 0) {
      return true;
    } else if (maxPeople > 1 && overlappingCount >= maxPeople) {
      return true;
    }
  }

  return false;
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

      // Filter appointments for this specific date - only confirmed appointments block slots
      const dateAppointments = appointments.filter((apt) => {
        const aptDate = apt.appointmentTime.split("T")[0];
        return aptDate === dateStr && apt.status === "confirmed";
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

    // Filter appointments for this specific date - only confirmed appointments block slots
    const dateAppointments = appointments.filter((apt) => {
      const aptDate = apt.appointmentTime.split("T")[0];
      return aptDate === args.date && apt.status === "confirmed";
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

// Internal query to get all appointments for a business (for actions)
export const getAppointmentsByBusinessId = internalQuery({
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
        // Calculate end time based on service duration (case-insensitive, trimmed, and accent-insensitive)
        const normalizedServiceName = sanitizeString(apt.serviceName);
        const service = business.appointmentConfig.services.find(
          (s) => sanitizeString(s.name) === normalizedServiceName
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

    // Find the service to get its duration (case-insensitive, trimmed, and accent-insensitive)
    const normalizedServiceName = sanitizeString(args.serviceName);
    const service = business.appointmentConfig.services.find(
      (s) => sanitizeString(s.name) === normalizedServiceName
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
    const serviceMaxPeople = service.maxPeople ?? 1; // Default to 1 if not specified

    // Check if slot conflicts with existing appointments
    const existingAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_business_id", (q) => q.eq("businessId", args.businessId))
      .collect();

    // Filter appointments for the same date - only confirmed appointments block slots
    const [newApptDate] = args.appointmentTime.split("T");
    const sameDayAppointments = existingAppointments.filter((apt) => {
      const [aptDate] = apt.appointmentTime.split("T");
      return aptDate === newApptDate && apt.status === "confirmed";
    });

    // Calculate the requested appointment's time range
    const newStartTime = new Date(args.appointmentTime).getTime();
    const newEndTime = newStartTime + serviceDuration * 60 * 1000;

    // For services with maxPeople = 1, check for any overlapping appointments (existing behavior)
    if (serviceMaxPeople === 1) {
      const hasConflict = sameDayAppointments.some((apt) => {
        const normalizedExistingServiceName = sanitizeString(apt.serviceName);
        const existingService = business.appointmentConfig.services.find(
          (s) => sanitizeString(s.name) === normalizedExistingServiceName
        );
        const existingDuration = existingService?.duration || 60;

        const existingStartTime = new Date(apt.appointmentTime).getTime();
        const existingEndTime =
          existingStartTime + existingDuration * 60 * 1000;

        // Check if appointments overlap
        // Two appointments overlap if:
        // - New appointment starts before existing ends AND new ends after existing starts
        return newStartTime < existingEndTime && newEndTime > existingStartTime;
      });

      if (hasConflict) {
        throw new Error(
          "This time slot conflicts with an existing appointment"
        );
      }
    } else {
      // For services with maxPeople > 1, count overlapping appointments for the same service
      const normalizedNewServiceName = sanitizeString(args.serviceName);
      const overlappingAppointments = sameDayAppointments.filter((apt) => {
        const normalizedExistingServiceName = sanitizeString(apt.serviceName);

        // Only count appointments for the same service
        if (normalizedExistingServiceName !== normalizedNewServiceName) {
          return false;
        }

        const existingService = business.appointmentConfig.services.find(
          (s) => sanitizeString(s.name) === normalizedExistingServiceName
        );
        const existingDuration = existingService?.duration || 60;

        const existingStartTime = new Date(apt.appointmentTime).getTime();
        const existingEndTime =
          existingStartTime + existingDuration * 60 * 1000;

        // Check if appointments overlap
        return newStartTime < existingEndTime && newEndTime > existingStartTime;
      });

      // Check if capacity is exceeded
      if (overlappingAppointments.length >= serviceMaxPeople) {
        throw new Error(
          `This service is fully booked. Maximum capacity is ${serviceMaxPeople} people.`
        );
      }
    }

    // Generate unique cancellation token
    const cancellationToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

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
      cancellationToken,
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

    // Delete from Google Calendar if exists
    if (appointment.googleCalendarEventId && business?.googleCalendarEnabled) {
      try {
        await ctx.runAction(internal.googleCalendar.deleteCalendarEvent, {
          businessId: appointment.businessId,
          eventId: appointment.googleCalendarEventId,
        });
      } catch (error) {
        console.error("Failed to delete from Google Calendar:", error);
      }
    }

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
        email: business.email,
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

    // Generate cancellation token if it doesn't exist
    const cancellationToken =
      appointment.cancellationToken ||
      `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    await ctx.db.patch(args.appointmentId, {
      status: "confirmed",
      ownerNote: args.ownerNote,
      cancellationToken,
    });

    return { success: true, appointment };
  },
});

// Action to confirm an appointment and send email
export const confirmAppointment = action({
  args: {
    appointmentId: v.id("appointments"),
    ownerNote: v.optional(v.string()),
    forceConfirm: v.optional(v.boolean()), // Flag to bypass capacity check
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

    // Check capacity before confirming (unless forceConfirm is true)
    if (!args.forceConfirm) {
      // Find the service to get maxPeople
      const normalizedServiceName = sanitizeString(appointment.serviceName);
      const service = business.appointmentConfig.services.find(
        (s) => sanitizeString(s.name) === normalizedServiceName
      );
      const serviceMaxPeople = service?.maxPeople ?? 1; // Default to 1 if not specified
      const serviceDuration = service?.duration || 60;

      // Get all appointments for the same date and time slot
      const existingAppointments = await ctx.runQuery(
        internal.appointments.getAppointmentsByBusinessId,
        {
          businessId: appointment.businessId,
        }
      );

      const apptStartTime = new Date(appointment.appointmentTime).getTime();
      const apptEndTime = apptStartTime + serviceDuration * 60 * 1000;

      // Count overlapping confirmed appointments for the same service
      const overlappingConfirmed = existingAppointments.filter((apt) => {
        // Only count confirmed appointments (exclude the current appointment being confirmed)
        if (apt.status !== "confirmed" || apt._id === args.appointmentId) {
          return false;
        }

        // Only count appointments for the same service
        const normalizedExistingServiceName = sanitizeString(apt.serviceName);
        if (normalizedExistingServiceName !== normalizedServiceName) {
          return false;
        }

        // Check if appointments overlap
        const existingService = business.appointmentConfig.services.find(
          (s) => sanitizeString(s.name) === normalizedExistingServiceName
        );
        const existingDuration = existingService?.duration || 60;
        const existingStartTime = new Date(apt.appointmentTime).getTime();
        const existingEndTime =
          existingStartTime + existingDuration * 60 * 1000;

        return (
          apptStartTime < existingEndTime && apptEndTime > existingStartTime
        );
      });

      // If capacity would be exceeded, throw a specific error
      if (overlappingConfirmed.length >= serviceMaxPeople) {
        const currentCount = overlappingConfirmed.length;
        const maxCapacity = serviceMaxPeople;

        let message: string;
        if (maxCapacity === 1) {
          message =
            "Ya existe una cita confirmada para este servicio en este horario. La capacidad máxima es de 1 persona.";
        } else {
          message = `Este servicio ya tiene ${currentCount} ${currentCount === 1 ? "cita confirmada" : "citas confirmadas"} en este horario. La capacidad máxima es de ${maxCapacity} personas.`;
        }

        throw new Error(`CAPACITY_EXCEEDED: ${message}`);
      }
    }

    // Confirm the appointment
    const result: { success: boolean; appointment: any } =
      await ctx.runMutation(internal.appointments.confirmAppointmentMutation, {
        appointmentId: args.appointmentId,
        ownerNote: args.ownerNote,
      });

    // Get updated appointment with cancellation token
    const updatedAppointment = await ctx.runQuery(
      internal.appointments.getAppointmentById,
      {
        appointmentId: args.appointmentId,
      }
    );

    // Send email if customer has email
    if (updatedAppointment && updatedAppointment.customerData.email) {
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
        customerEmail: updatedAppointment.customerData.email,
        customerName: updatedAppointment.customerData.name,
        businessName: business.name,
        subdomain: business.subdomain,
        serviceName: updatedAppointment.serviceName,
        appointmentTime: updatedAppointment.appointmentTime,
        actionType: "confirmed" as const,
        ownerNote: args.ownerNote,
        logoUrl,
        phone: business.phone,
        email: business.email,
        cancellationToken: updatedAppointment.cancellationToken,
      });
    }

    // Sync to Google Calendar if enabled
    console.log("🔍 Google Calendar sync check:", {
      googleCalendarEnabled: business?.googleCalendarEnabled,
      businessId: business?._id,
      appointmentId: args.appointmentId,
    });

    if (business?.googleCalendarEnabled) {
      console.log("✅ Google Calendar is enabled, attempting to sync...");
      try {
        // Find the service to get duration (case-insensitive, trimmed, and accent-insensitive)
        const normalizedServiceName = sanitizeString(appointment.serviceName);
        const service = business.appointmentConfig.services.find(
          (s) => sanitizeString(s.name) === normalizedServiceName
        );
        const duration = service?.duration || 60;

        console.log("📅 Creating calendar event with:", {
          title: `${appointment.customerData.name} - ${appointment.serviceName}`,
          startTime: appointment.appointmentTime,
          duration,
        });

        const eventId = await ctx.runAction(
          internal.googleCalendar.createCalendarEvent,
          {
            businessId: business._id,
            appointmentId: args.appointmentId,
            title: `${appointment.customerData.name} - ${appointment.serviceName}`,
            startTime: appointment.appointmentTime,
            duration: duration,
            description: appointment.notes,
          }
        );

        console.log(
          "🎉 Calendar event created successfully! Event ID:",
          eventId
        );

        // Save event ID
        await ctx.runMutation(internal.appointments.updateGoogleEventId, {
          appointmentId: args.appointmentId,
          googleCalendarEventId: eventId,
        });

        console.log("✅ Event ID saved to appointment");
      } catch (error) {
        console.error("❌ Google Calendar sync failed:", error);
        // No interrumpir el flujo principal
      }
    } else {
      console.log("⚠️ Google Calendar sync is DISABLED or business not found");
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

    // Find the service to get its duration (case-insensitive, trimmed, and accent-insensitive)
    const normalizedServiceName = sanitizeString(appointment.serviceName);
    const service = business.appointmentConfig.services.find(
      (s) => sanitizeString(s.name) === normalizedServiceName
    );

    if (!service) {
      const availableServices = business.appointmentConfig.services
        .map((s) => s.name)
        .join(", ");
      throw new Error(
        `Service not found: "${appointment.serviceName}". Available services: ${availableServices}`
      );
    }

    const serviceDuration = service.duration;
    const serviceMaxPeople = service.maxPeople ?? 1; // Default to 1 if not specified

    // Check if slot conflicts with existing appointments (excluding current one)
    const existingAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_business_id", (q) =>
        q.eq("businessId", appointment.businessId)
      )
      .collect();

    // Filter appointments for the same date (excluding the current appointment being rescheduled)
    // Only confirmed appointments block slots
    const [newApptDate] = args.newAppointmentTime.split("T");
    const sameDayAppointments = existingAppointments.filter((apt) => {
      const [aptDate] = apt.appointmentTime.split("T");
      return (
        aptDate === newApptDate &&
        apt.status === "confirmed" &&
        apt._id !== args.appointmentId
      );
    });

    // Calculate the requested appointment's time range
    const newStartTime = new Date(args.newAppointmentTime).getTime();
    const newEndTime = newStartTime + serviceDuration * 60 * 1000;

    // For services with maxPeople = 1, check for any overlapping appointments (existing behavior)
    if (serviceMaxPeople === 1) {
      const hasConflict = sameDayAppointments.some((apt) => {
        const normalizedExistingServiceName = sanitizeString(apt.serviceName);
        const existingService = business.appointmentConfig.services.find(
          (s) => sanitizeString(s.name) === normalizedExistingServiceName
        );
        const existingDuration = existingService?.duration || 60;

        const existingStartTime = new Date(apt.appointmentTime).getTime();
        const existingEndTime =
          existingStartTime + existingDuration * 60 * 1000;

        // Check if appointments overlap
        return newStartTime < existingEndTime && newEndTime > existingStartTime;
      });

      if (hasConflict) {
        throw new Error(
          "This time slot conflicts with an existing appointment"
        );
      }
    } else {
      // For services with maxPeople > 1, count overlapping appointments for the same service
      const normalizedNewServiceName = sanitizeString(appointment.serviceName);
      const overlappingAppointments = sameDayAppointments.filter((apt) => {
        const normalizedExistingServiceName = sanitizeString(apt.serviceName);

        // Only count appointments for the same service
        if (normalizedExistingServiceName !== normalizedNewServiceName) {
          return false;
        }

        const existingService = business.appointmentConfig.services.find(
          (s) => sanitizeString(s.name) === normalizedExistingServiceName
        );
        const existingDuration = existingService?.duration || 60;

        const existingStartTime = new Date(apt.appointmentTime).getTime();
        const existingEndTime =
          existingStartTime + existingDuration * 60 * 1000;

        // Check if appointments overlap
        return newStartTime < existingEndTime && newEndTime > existingStartTime;
      });

      // Check if capacity is exceeded
      if (overlappingAppointments.length >= serviceMaxPeople) {
        throw new Error(
          `This service is fully booked. Maximum capacity is ${serviceMaxPeople} people.`
        );
      }
    }

    // Generate cancellation token if it doesn't exist
    const cancellationToken =
      appointment.cancellationToken ||
      `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    // Update the appointment
    await ctx.db.patch(args.appointmentId, {
      rescheduledFrom: appointment.appointmentTime,
      appointmentTime: args.newAppointmentTime,
      ownerNote: args.ownerNote,
      status: "confirmed", // Auto-confirm when rescheduled by owner
      cancellationToken,
    });

    return { success: true, appointment };
  },
});

// Internal mutation to update Google Calendar event ID
export const updateGoogleEventId = internalMutation({
  args: {
    appointmentId: v.id("appointments"),
    googleCalendarEventId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.appointmentId, {
      googleCalendarEventId: args.googleCalendarEventId,
    });
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

    // Get updated appointment with cancellation token
    const updatedAppointment = await ctx.runQuery(
      internal.appointments.getAppointmentById,
      {
        appointmentId: args.appointmentId,
      }
    );

    // Update Google Calendar event if exists
    if (
      updatedAppointment &&
      updatedAppointment.googleCalendarEventId &&
      business?.googleCalendarEnabled
    ) {
      try {
        // Find the service to get duration (case-insensitive, trimmed, and accent-insensitive)
        const normalizedServiceName = sanitizeString(
          updatedAppointment.serviceName
        );
        const service = business.appointmentConfig.services.find(
          (s) => sanitizeString(s.name) === normalizedServiceName
        );
        const duration = service?.duration || 60;

        await ctx.runAction(internal.googleCalendar.updateCalendarEvent, {
          businessId: updatedAppointment.businessId,
          eventId: updatedAppointment.googleCalendarEventId,
          startTime: args.newAppointmentTime,
          duration: duration,
        });
      } catch (error) {
        console.error("Failed to update Google Calendar:", error);
      }
    }

    // Send email if customer has email
    if (updatedAppointment && updatedAppointment.customerData.email) {
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
        customerEmail: updatedAppointment.customerData.email,
        customerName: updatedAppointment.customerData.name,
        businessName: business.name,
        subdomain: business.subdomain,
        serviceName: updatedAppointment.serviceName,
        appointmentTime: args.newAppointmentTime,
        actionType: "rescheduled" as const,
        ownerNote: args.ownerNote,
        rescheduledFrom: originalTime,
        logoUrl,
        phone: business.phone,
        email: business.email,
        cancellationToken: updatedAppointment.cancellationToken,
      });
    }

    return result;
  },
});

// Query to get appointment by cancellation token
export const getAppointmentByToken = query({
  args: {
    cancellationToken: v.string(),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db
      .query("appointments")
      .withIndex("by_cancellation_token", (q) =>
        q.eq("cancellationToken", args.cancellationToken)
      )
      .first();

    if (!appointment) {
      return null;
    }

    // Get business details
    const business = await ctx.db.get(appointment.businessId);

    return {
      appointment,
      business,
    };
  },
});

// Action to cancel appointment by token (public endpoint)
export const cancelAppointmentByToken = action({
  args: {
    cancellationToken: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; appointment: any }> => {
    // Get appointment by token
    const appointmentData:
      | { appointment: any; business: any }
      | null
      | undefined = await ctx.runQuery(
      internal.appointments.getAppointmentByTokenInternal,
      {
        cancellationToken: args.cancellationToken,
      }
    );

    if (!appointmentData || !appointmentData.appointment) {
      throw new Error("Appointment not found or invalid token");
    }

    const { appointment, business }: { appointment: any; business: any } =
      appointmentData;

    // Check if appointment is already cancelled
    if (appointment.status === "cancelled") {
      throw new Error("Appointment is already cancelled");
    }

    // Cancel the appointment
    const result: { success: boolean; appointment: any } =
      await ctx.runMutation(internal.appointments.cancelAppointmentMutation, {
        appointmentId: appointment._id,
        ownerNote: "Cancelado por el cliente desde el correo electrónico",
      });

    // Delete from Google Calendar if exists
    if (appointment.googleCalendarEventId && business?.googleCalendarEnabled) {
      try {
        await ctx.runAction(internal.googleCalendar.deleteCalendarEvent, {
          businessId: appointment.businessId,
          eventId: appointment.googleCalendarEventId,
        });
      } catch (error) {
        console.error("Failed to delete from Google Calendar:", error);
      }
    }

    // Send email if customer has email
    if (appointment.customerData.email) {
      // Get logo URL if it exists
      let logoUrl: string | undefined;
      if (business.visualConfig?.logoUrl) {
        try {
          logoUrl =
            (await ctx.storage.getUrl(business.visualConfig.logoUrl)) ||
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
        ownerNote: "Cancelado por el cliente desde el correo electrónico",
        logoUrl,
        phone: business.phone,
        email: business.email,
        cancellationToken: appointment.cancellationToken,
      });
    }

    return result;
  },
});

// Internal query to get appointment by token (for action)
export const getAppointmentByTokenInternal = internalQuery({
  args: {
    cancellationToken: v.string(),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db
      .query("appointments")
      .withIndex("by_cancellation_token", (q) =>
        q.eq("cancellationToken", args.cancellationToken)
      )
      .first();

    if (!appointment) {
      return null;
    }

    // Get business details
    const business = await ctx.db.get(appointment.businessId);

    return {
      appointment,
      business,
    };
  },
});

// Query to get appointment statistics by status
export const getAppointmentStats = query({
  args: {
    businessId: v.id("businesses"),
  },
  handler: async (ctx, args) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_business_id", (q) => q.eq("businessId", args.businessId))
      .collect();

    const stats = {
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      total: appointments.length,
    };

    for (const apt of appointments) {
      if (apt.status === "pending") stats.pending++;
      else if (apt.status === "confirmed") stats.confirmed++;
      else if (apt.status === "cancelled") stats.cancelled++;
    }

    return stats;
  },
});

// Query to get appointments grouped by service
export const getAppointmentsByService = query({
  args: {
    businessId: v.id("businesses"),
  },
  handler: async (ctx, args) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_business_id", (q) => q.eq("businessId", args.businessId))
      .collect();

    const serviceMap = new Map<string, number>();

    for (const apt of appointments) {
      if (apt.status !== "cancelled") {
        const count = serviceMap.get(apt.serviceName) || 0;
        serviceMap.set(apt.serviceName, count + 1);
      }
    }

    return Array.from(serviceMap.entries()).map(([serviceName, count]) => ({
      serviceName,
      count,
    }));
  },
});

// Query to get appointments grouped by day of week
export const getAppointmentsByDayOfWeek = query({
  args: {
    businessId: v.id("businesses"),
  },
  handler: async (ctx, args) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_business_id", (q) => q.eq("businessId", args.businessId))
      .collect();

    const dayMap: Record<string, number> = {
      Lunes: 0,
      Martes: 0,
      Miércoles: 0,
      Jueves: 0,
      Viernes: 0,
      Sábado: 0,
      Domingo: 0,
    };

    for (const apt of appointments) {
      if (apt.status !== "cancelled") {
        const date = new Date(apt.appointmentTime);
        const dayOfWeekEnglish = date.toLocaleDateString("en-US", {
          weekday: "long",
        });

        const dayMapEnglish: Record<string, string> = {
          Monday: "Lunes",
          Tuesday: "Martes",
          Wednesday: "Miércoles",
          Thursday: "Jueves",
          Friday: "Viernes",
          Saturday: "Sábado",
          Sunday: "Domingo",
        };

        const daySpanish = dayMapEnglish[dayOfWeekEnglish] || dayOfWeekEnglish;
        if (dayMap[daySpanish] !== undefined) {
          dayMap[daySpanish]++;
        }
      }
    }

    return Object.entries(dayMap).map(([day, count]) => ({
      day,
      count,
    }));
  },
});

// Query to get appointments trend for the last 30 days
export const getAppointmentsTrend = query({
  args: {
    businessId: v.id("businesses"),
  },
  handler: async (ctx, args) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_business_id", (q) => q.eq("businessId", args.businessId))
      .collect();

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Filter appointments from last 30 days
    const recentAppointments = appointments.filter((apt) => {
      const aptDate = new Date(apt.appointmentTime);
      return aptDate >= thirtyDaysAgo && apt.status !== "cancelled";
    });

    // Group by date
    const dateMap = new Map<string, number>();

    for (const apt of recentAppointments) {
      const date = new Date(apt.appointmentTime);
      const dateStr = date.toISOString().split("T")[0] ?? "";
      const count = dateMap.get(dateStr) || 0;
      dateMap.set(dateStr, count + 1);
    }

    // Generate all dates in range and fill missing dates with 0
    const trendData: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(thirtyDaysAgo.getDate() + i);
      const dateStr = date.toISOString().split("T")[0] ?? "";
      const count = dateMap.get(dateStr) || 0;
      trendData.push({ date: dateStr, count });
    }

    return trendData;
  },
});
