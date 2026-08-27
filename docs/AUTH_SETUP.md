# CPGRAMS Supabase Auth setup

The connected Supabase project remains the only authentication provider. This
application does not require a Lovable account, Lovable preview URL, custom OTP
store, or browser service-role key.

## Required URL configuration

In **Supabase Dashboard → Authentication → URL Configuration** set:

1. **Site URL** to the canonical CPGRAMS production origin, for example
   `https://cpgrams.example.gov.in`. Do not set it to `lovable.dev` or a preview URL.
2. **Redirect URLs** to the exact callback path for every CPGRAMS origin that is
   intentionally supported:
   - `https://cpgrams.example.gov.in/auth/callback`
   - `http://localhost:5173/auth/callback` for local Vite development
   - an explicit callback URL for any approved staging domain, if one exists.

Do not use a broad production wildcard. Supabase will reject a `redirectTo` URL
that is not on this allow-list. The browser calls the central
`authCallbackUrl()` helper, which uses the current website origin in a browser
and `VITE_APP_URL` only as an SSR/non-browser fallback. Set `VITE_APP_URL` to
the canonical CPGRAMS deployment origin for non-browser rendering; it is public
configuration, not a secret.

## Email confirmation and recovery

- Citizen signup always sends `emailRedirectTo` to `/auth/callback`. With
  **Confirm Email enabled**, Supabase returns a user without a session; the UI
  shows “Check your email”, and the confirmation link returns to this site.
  With it disabled, Supabase returns a session and the citizen is routed to
  `/citizen` after their profile loads.
- Password recovery always sends `redirectTo` to
  `/auth/callback?type=recovery`. The installed browser client uses Supabase's
  default implicit flow, so a recovery link can establish its browser session
  on the device that opens it. The callback also exchanges a PKCE `code` if a
  configured flow returns one. Only then does the password form become
  available.
- Configure the Confirm signup and Reset password email templates to include
  Supabase's confirmation URL/link. Login/recovery OTP templates that use the
  existing code UI must render `{{ .Token }}`; the current project expects an
  eight-digit code.
- Configure custom SMTP and rate limits in Supabase for production delivery.
  The browser never calls Resend directly and does not reveal whether an
  arbitrary government email is registered.

## Profile and security contract

The signup trigger links `auth.users.id` to `profiles.id` and defaults the role
to `citizen`. Public signup sends full name and required mobile number, plus
optional gender/location metadata. Gender/address are not authorization inputs
and are not copied into `profiles` because the current schema has no such
columns. A future profile-schema change must be separately scoped and must not
weaken the role/organization RLS protections.

Browser clients use only the Supabase publishable key and normal browser-local
session storage. Do not place `SUPABASE_SERVICE_ROLE_KEY`, SMTP credentials, or
passwords in `VITE_*` variables.
