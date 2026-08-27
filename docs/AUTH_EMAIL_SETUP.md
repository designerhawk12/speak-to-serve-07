# Supabase Auth Email Delivery Setup

The application uses Supabase Auth as the only authority for login OTPs and password-recovery OTPs. Resend is delivery infrastructure configured through Supabase Auth; the browser must never call Resend directly.

## Required hosted configuration

1. In Resend, verify the sending domain and create the production sender identity.
2. In the Supabase dashboard for the connected project, configure Auth custom SMTP with the Resend SMTP credentials and the verified sender. Keep the Resend API key/SMTP password out of this repository and out of all `VITE_*` variables.
3. In **Auth > Email Templates**, configure both the Magic Link/login template and Reset Password template to display `{{ .Token }}`. The connected project currently delivers an eight-digit token, which the application accepts in full. Do not replace it with an application-generated code.
4. Configure the Auth site URL and allowed redirect URLs exactly as documented in `docs/AUTH_SETUP.md`. Confirmation and recovery links must target `/auth/callback` on this CPGRAMS website, never a Lovable URL.
5. Review Auth email rate limits and OTP expiry for the production traffic profile. The UI enforces a 60-second resend wait, but Supabase remains the authoritative rate limiter.

## Application calls

- Login request: `signInWithOtp({ email, options: { shouldCreateUser: false } })`
- Login verification: `verifyOtp({ email, token, type: "email" })`
- Recovery request: `resetPasswordForEmail(email, { redirectTo: authCallbackUrl("recovery") })`
- Recovery verification: `verifyOtp({ email, token, type: "recovery" })`
- Password update: `updateUser({ password })`, exposed only after successful recovery verification

No database migration, custom OTP table, Edge Function, or direct Resend SDK/API integration is required.
