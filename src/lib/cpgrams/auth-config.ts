/**
 * Supabase Auth owns password and email-code authentication in every mode.
 * Email transport is configured externally through Supabase custom SMTP.
 */
export function createAuthFeatures(developmentMode: boolean) {
  return Object.freeze({
    developmentMode,
    passwordSignIn: true,
    emailOtp: true,
    passwordRecovery: true,
    // The UI supports both project settings. Supabase determines whether a
    // sign-up returns a session or a confirmation link.
    emailConfirmation: true,
  });
}

export const AUTH_FEATURES = createAuthFeatures(import.meta.env.DEV);
