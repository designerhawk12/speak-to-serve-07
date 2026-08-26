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
    emailConfirmation: !developmentMode,
  });
}

export const AUTH_FEATURES = createAuthFeatures(import.meta.env.DEV);
