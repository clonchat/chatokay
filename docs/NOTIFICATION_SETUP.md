# Notification System Setup Guide

This document explains how to configure the appointment notification system with email integration.

## Overview

The system now includes:

- Real-time notifications in the dashboard topbar for pending appointments
- Email notifications to customers when appointments are confirmed, cancelled, or rescheduled
- Ability for owners to add notes when managing appointments
- Reschedule functionality with available time slot selection

## Required Configuration

### 1. Resend API Key

The system uses Resend for sending emails. You need to:

1. Create a Resend account at https://resend.com
2. Get your API key from the Resend dashboard
3. Configure the sender domain (or use the test domain for development)
4. Add the API key to your Convex environment variables

#### Adding to Convex Dashboard

1. Go to https://dashboard.convex.dev
2. Select your project
3. Navigate to Settings > Environment Variables
4. Add a new variable:
   - Name: `RESEND_API_KEY`
   - Value: Your Resend API key (starts with `re_`)

### 2. Email Sender Configuration

By default, emails are sent from `notificaciones@chatokay.com`. To use this:

1. In Resend dashboard, verify your domain `chatokay.com`
2. Add the required DNS records (MX, TXT, DKIM)
3. Wait for verification

#### For Development/Testing

If you want to test emails without configuring a custom domain, Resend provides a testing email that you can use. Update the `from` field in `packages/backend/convex/email.ts`:

```typescript
from: "onboarding@resend.dev", // Use this for testing
```

## Features Implemented

### 1. Topbar Notifications

- Shows a bell icon with badge count of pending appointments
- Badge animates when new appointments arrive
- Dropdown shows the 5 most recent pending appointments
- Clicking an appointment navigates to the Citas page and opens the modal

### 2. Enhanced Appointment Modal

#### Owner Notes

- Optional text field for adding notes visible to customers
- Notes are included in email notifications
- Notes are stored in the appointment record

#### Reschedule Functionality

- "Reprogramar Cita" button for pending and confirmed appointments
- Date picker for selecting new date
- Available time slots shown based on business availability
- Automatic conflict detection with existing appointments
- Appointment is auto-confirmed when rescheduled by owner

### 3. Email Notifications

Customers receive emails when:

- Appointment is confirmed
- Appointment is cancelled
- Appointment is rescheduled

Each email includes:

- Full appointment details (service, date, time)
- Business information
- Owner's note (if provided)
- Original time (for rescheduled appointments)
- Link to the business chatbot

## Schema Changes

The appointments table now includes:

- `ownerNote`: Optional string for owner's notes to customers
- `rescheduledFrom`: Optional string tracking the original appointment time

## API Changes

### Modified Mutations (now Actions)

All appointment mutations are now actions to support email sending:

- `confirmAppointment(appointmentId, ownerNote?)`
- `cancelAppointment(appointmentId, ownerNote?)`
- `rescheduleAppointment(appointmentId, newAppointmentTime, ownerNote?)`

### New Queries

- `getPendingAppointments(businessId, limit?)` - Gets pending appointments for notifications

### Internal Functions

New internal functions for action composition:

- `cancelAppointmentMutation`
- `confirmAppointmentMutation`
- `rescheduleAppointmentMutation`
- `getAppointmentById`
- `getBusinessById`
- `sendAppointmentEmail`

## Testing

### Testing Notifications

1. Create a new appointment through the chatbot
2. The notification bell should show a badge with count
3. Click the bell to see the appointment in the dropdown
4. Click the appointment to open the detail modal

### Testing Emails

1. Ensure an appointment has a customer email
2. Confirm, cancel, or reschedule the appointment
3. Add an optional note
4. Check the customer's inbox for the notification email

**Note**: If using the Resend test domain, emails can only be sent to your verified email address.

## Troubleshooting

### Emails Not Sending

1. Check that `RESEND_API_KEY` is set in Convex environment variables
2. Verify the API key is valid in Resend dashboard
3. Check Convex logs for email errors (emails fail gracefully, won't break appointments)
4. Ensure customer has an email address in the appointment

### Notifications Not Appearing

1. Check that the business ID is being passed correctly to the topbar
2. Verify appointments have status "pending"
3. Check browser console for React errors
4. Ensure Convex is running and connected

### Reschedule Not Working

1. Verify business has availability configured for the selected date
2. Check for time slot conflicts with existing appointments
3. Ensure the selected time is within business hours
4. Check Convex logs for validation errors

## Email Customization

To customize email templates, edit `packages/backend/convex/email.ts`:

- Modify `getEmailTemplate` function for content changes
- Update colors, fonts, and styling in the HTML template
- Change the `from` email address
- Adjust email subjects in `sendAppointmentEmail` action

## Production Considerations

1. **Domain Setup**: Configure a custom domain in Resend for production
2. **Email Limits**: Check Resend plan limits for email volume
3. **Error Monitoring**: Monitor Convex logs for email delivery failures
4. **Rate Limiting**: Implement rate limiting if needed for high-volume businesses
5. **Unsubscribe**: Consider adding unsubscribe functionality for customers

## Support

For issues related to:

- **Resend**: Check https://resend.com/docs
- **Convex**: Check https://docs.convex.dev
- **Email deliverability**: Verify DNS records and domain authentication

