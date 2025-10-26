import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

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
    const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });

    // Find availability for this day
    const dayAvailability = business.availability.find(
      (av) => av.day.toLowerCase() === dayOfWeek.toLowerCase()
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

    // Return available slots with booked status
    const availableSlots = dayAvailability.slots.map((slot) => {
      const slotStart = `${args.date}T${slot.start}`;
      const isBooked = dateAppointments.some((apt) =>
        apt.appointmentTime.startsWith(slotStart)
      );

      return {
        start: slot.start,
        end: slot.end,
        isBooked,
      };
    });

    return availableSlots;
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
    const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });

    // Find availability for this day
    const dayAvailability = business.availability.find(
      (av) => av.day.toLowerCase() === dayOfWeek.toLowerCase()
    );

    if (!dayAvailability) {
      throw new Error("No availability for this day");
    }

    // Check if time slot exists
    const slotExists = dayAvailability.slots.some(
      (slot) => slot.start === time
    );

    if (!slotExists) {
      throw new Error("Time slot not available");
    }

    // Check if slot is already booked
    const existingAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_business_id", (q) => q.eq("businessId", args.businessId))
      .collect();

    const isBooked = existingAppointments.some(
      (apt) =>
        apt.appointmentTime === args.appointmentTime &&
        apt.status !== "cancelled"
    );

    if (isBooked) {
      throw new Error("This time slot is already booked");
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

// Mutation to cancel an appointment
export const cancelAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
    });

    return { success: true };
  },
});

// Mutation to confirm an appointment
export const confirmAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    await ctx.db.patch(args.appointmentId, {
      status: "confirmed",
    });

    return { success: true };
  },
});
