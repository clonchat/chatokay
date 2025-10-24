# ChatOkay Setup Guide

## Backend Setup (Convex)

### 1. Deploy Convex

From the backend directory:

```bash
cd packages/backend
npx convex deploy
```

This will deploy your Convex functions and generate the API endpoint.

### 2. Configure Clerk Webhook

After deploying Convex, you'll receive a deployment URL. The webhook endpoint will be:

```
https://[your-convex-deployment].convex.cloud/clerk-webhook
```

#### Steps to configure in Clerk:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **Webhooks** in the sidebar
4. Click **Add Endpoint**
5. Enter the webhook URL: `https://[your-convex-deployment].convex.cloud/clerk-webhook`
6. Subscribe to these events:
   - `user.created`
   - `user.updated`
7. Copy the **Signing Secret**
8. Add it to `packages/backend/.env.local`:

```env
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 3. Redeploy with Environment Variable

After adding the webhook secret:

```bash
cd packages/backend
npx convex env set CLERK_WEBHOOK_SECRET whsec_xxxxxxxxxxxxx
npx convex deploy
```

## Frontend Setup (Next.js)

The frontend already has the necessary environment variables configured:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CONVEX_URL`

### Run the development server:

```bash
cd apps/web
pnpm dev
```

## Testing the Flow

1. Navigate to `http://localhost:3000`
2. Click **Registrarse** (Sign Up)
3. Complete the Clerk registration
4. You'll be redirected to `/onboarding`
5. Complete the 3-step onboarding:
   - Step 1: Create your business (name, description, subdomain)
   - Step 2: Add services
   - Step 3: Configure availability
6. After completion, you'll be redirected to `/dashboard`

## Architecture

### Backend (Convex)
- `convex/schema.ts` - Database schema
- `convex/businesses.ts` - Business queries and mutations
- `convex/clerk.ts` - Clerk webhook handler (exports `webhook` httpAction)
- `convex/http.ts` - HTTP routing configuration (mounts webhook at `/clerk-webhook`)

### Frontend (Next.js)
- `app/(auth)/` - Authentication pages (sign-in, sign-up)
- `app/onboarding/` - Multi-step onboarding wizard
- `app/(dashboard)/` - Protected dashboard routes
- `app/(dashboard)/layout.tsx` - Gatekeeper that redirects to onboarding if needed

### UI Components
- `packages/ui/src/components/` - Shared UI components (Button, Input, Label, Card, etc.)

## Environment Variables

### Backend (packages/backend/.env.local)
```env
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Frontend (apps/web/.env.local)
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
NEXT_PUBLIC_CONVEX_URL=https://xxxxxxxxxxxxx.convex.cloud
```

## Troubleshooting

### Webhook not working
- Verify the webhook URL is correct in Clerk dashboard
- Check that `CLERK_WEBHOOK_SECRET` is set in Convex environment
- Look at Convex logs: `npx convex logs`

### User not syncing
- Check Clerk webhook delivery logs in Clerk dashboard
- Verify the webhook events are subscribed (`user.created`, `user.updated`)

### Onboarding redirect loop
- Make sure the onboarding page is NOT inside the `(dashboard)` route group
- Clear browser cache and cookies

### TypeScript errors
- Regenerate Convex types: `cd packages/backend && npx convex dev`
- Restart TypeScript server in your IDE

