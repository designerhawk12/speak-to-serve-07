import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/cpgrams/PasswordField";
import { supabase } from "@/integrations/supabase/client";
import { authCallbackUrl } from "@/lib/cpgrams/auth-url";
import {
  AUTH_OTP_LENGTH,
  AUTH_RESEND_SECONDS,
  authErrorMessage,
  isCompleteOtp,
  maskAuthEmail,
  normalizeOtpInput,
  requestRecoveryOtp,
  updateRecoveredPassword,
  validateNewPassword,
  verifyRecoveryOtp,
} from "@/lib/cpgrams/auth-otp";

export const Route = createFileRoute("/auth/forgot-password")({
  validateSearch: (search: Record<string, unknown>) => ({ recovery: search["recovery"] === "1" }),
  head: () => ({ meta: [{ title: "Reset your password — CPGRAMS Resolution Workspace" }] }),
  component: ForgotPasswordPage,
});

type RecoveryStage = "email" | "otp" | "password" | "complete";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { recovery } = Route.useSearch();
  const [stage, setStage] = useState<RecoveryStage>("email");
  const [email, setEmail] = useState("");
  const [requestedEmail, setRequestedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [recoveryVerified, setRecoveryVerified] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState<"request" | "verify" | "resend" | "update" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestInFlight = useRef(false);

  useEffect(() => {
    if (!recovery) return;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError || !data.session) {
        setError("Your recovery link is invalid or has expired. Request a new one and try again.");
        return;
      }
      setRecoveryVerified(true);
      setStage("password");
      setMessage("Your recovery link was verified. Set a new password.");
    });
  }, [recovery]);

  const beginRequest = (operation: NonNullable<typeof busy>) => {
    if (requestInFlight.current) return false;
    requestInFlight.current = true;
    setBusy(operation);
    return true;
  };

  const endRequest = () => {
    requestInFlight.current = false;
    setBusy(null);
  };

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  const requestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!beginRequest("request")) return;
    setError(null);
    setMessage(null);
    try {
      const normalized = await requestRecoveryOtp(email, authCallbackUrl("recovery"));
      setRequestedEmail(normalized);
      setEmail(normalized);
      setOtp("");
      setSeconds(AUTH_RESEND_SECONDS);
      setStage("otp");
      setMessage("If an eligible account exists for this email, a recovery code has been sent.");
    } catch (requestError) {
      setError(authErrorMessage(requestError));
    } finally {
      endRequest();
    }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requestedEmail || !beginRequest("verify")) return;
    setError(null);
    setMessage(null);
    try {
      await verifyRecoveryOtp(requestedEmail, otp);
      setOtp("");
      setRecoveryVerified(true);
      setStage("password");
    } catch (verifyError) {
      setError(authErrorMessage(verifyError));
    } finally {
      endRequest();
    }
  };

  const resend = async () => {
    if (seconds > 0 || !requestedEmail || !beginRequest("resend")) return;
    setError(null);
    setMessage(null);
    try {
      await requestRecoveryOtp(requestedEmail, authCallbackUrl("recovery"));
      setOtp("");
      setSeconds(AUTH_RESEND_SECONDS);
      setMessage("A new recovery code has been requested.");
    } catch (requestError) {
      setError(authErrorMessage(requestError));
    } finally {
      endRequest();
    }
  };

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!beginRequest("update")) return;
    const validation = validateNewPassword(password, confirmation);
    if (validation) {
      setError(validation);
      endRequest();
      return;
    }
    setError(null);
    setMessage(null);
    try {
      await updateRecoveredPassword(password, confirmation, recoveryVerified);
      setPassword("");
      setConfirmation("");
      setRecoveryVerified(false);
      setStage("complete");
      await supabase.auth.signOut({ scope: "local" });
    } catch (updateError) {
      setError(authErrorMessage(updateError));
    } finally {
      endRequest();
    }
  };

  const changeEmail = () => {
    setStage("email");
    setRequestedEmail("");
    setOtp("");
    setRecoveryVerified(false);
    setSeconds(0);
    setMessage(null);
    setError(null);
  };

  return (
    <Card className="border-border">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">
            {stage === "password"
              ? "Choose a new password"
              : stage === "complete"
                ? "Password updated"
                : "Reset your password"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {stage === "email"
              ? "Enter your account email to request a recovery code."
              : stage === "otp"
                ? `Enter the recovery code sent to ${maskAuthEmail(requestedEmail)}.`
                : stage === "password"
                  ? "Your recovery code was verified. Set a new password."
                  : "Your password has been changed. Sign in with your new password or request an email code."}
          </p>
        </div>
        {stage === "email" && (
          <form className="space-y-4" onSubmit={requestCode}>
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy !== null}>
              {busy === "request" ? "Sending…" : "Send recovery code"}
            </Button>
          </form>
        )}
        {stage === "otp" && (
          <form className="space-y-4" onSubmit={verifyCode}>
            <div className="space-y-2">
              <Label htmlFor="recovery-code">{AUTH_OTP_LENGTH}-digit recovery code</Label>
              <InputOTP
                id="recovery-code"
                maxLength={AUTH_OTP_LENGTH}
                value={otp}
                onChange={(value) => setOtp(normalizeOtpInput(value))}
                autoComplete="one-time-code"
                inputMode="numeric"
                autoFocus
                disabled={busy !== null}
              >
                <InputOTPGroup className="w-full max-w-72">
                  {Array.from({ length: AUTH_OTP_LENGTH }, (_, index) => (
                    <InputOTPSlot key={index} index={index} className="h-9 w-auto min-w-0 flex-1" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={busy !== null || !isCompleteOtp(otp)}
            >
              {busy === "verify" ? "Verifying…" : "Verify recovery code"}
            </Button>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy !== null || seconds > 0}
                onClick={() => void resend()}
              >
                {busy === "resend"
                  ? "Sending…"
                  : seconds > 0
                    ? `Resend in ${seconds}s`
                    : "Resend code"}
              </Button>
              <Button type="button" variant="ghost" disabled={busy !== null} onClick={changeEmail}>
                Use a different email
              </Button>
            </div>
          </form>
        )}
        {stage === "password" && recoveryVerified && (
          <form className="space-y-4" onSubmit={updatePassword}>
            <PasswordField
              id="new-password"
              label="New password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              minLength={8}
              required
              helpText="Use at least 8 characters."
            />
            <PasswordField
              id="confirm-password"
              label="Confirm new password"
              autoComplete="new-password"
              value={confirmation}
              onChange={setConfirmation}
              minLength={8}
              required
            />
            <Button type="submit" className="w-full" disabled={busy !== null}>
              {busy === "update" ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
        {message && (
          <p
            className="rounded-md bg-surface-sunken p-3 text-sm text-muted-foreground"
            role="status"
          >
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-md bg-critical-surface p-3 text-sm text-critical" role="alert">
            {error}
          </p>
        )}
        {stage === "complete" ? (
          <Button
            type="button"
            className="w-full"
            onClick={() => void navigate({ to: "/auth/login" })}
          >
            Continue to sign in
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link to="/auth/login" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
