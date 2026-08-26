import { useEffect, useRef, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
  AUTH_OTP_LENGTH,
  AUTH_RESEND_SECONDS,
  authErrorMessage,
  isCompleteOtp,
  maskAuthEmail,
  normalizeOtpInput,
  requestLoginOtp,
  verifyLoginOtp,
} from "@/lib/cpgrams/auth-otp";

export function EmailOtpLogin({
  onAuthenticated,
}: {
  onAuthenticated: (user: User) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [requestedEmail, setRequestedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState<"request" | "verify" | "resend" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestInFlight = useRef(false);

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

  const sendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!beginRequest("request")) return;
    setError(null);
    setMessage(null);
    try {
      const normalized = await requestLoginOtp(email);
      setRequestedEmail(normalized);
      setEmail(normalized);
      setOtp("");
      setSeconds(AUTH_RESEND_SECONDS);
      setMessage("If this email is eligible, a verification code has been sent.");
    } catch (requestError) {
      setError(authErrorMessage(requestError));
    } finally {
      endRequest();
    }
  };

  const verifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requestedEmail || !beginRequest("verify")) return;
    setError(null);
    setMessage(null);
    try {
      const { user } = await verifyLoginOtp(requestedEmail, otp);
      setOtp("");
      await onAuthenticated(user!);
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
      await requestLoginOtp(requestedEmail);
      setOtp("");
      setSeconds(AUTH_RESEND_SECONDS);
      setMessage("A new verification code has been requested.");
    } catch (requestError) {
      setError(authErrorMessage(requestError));
    } finally {
      endRequest();
    }
  };

  const changeEmail = () => {
    setRequestedEmail("");
    setOtp("");
    setSeconds(0);
    setMessage(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {!requestedEmail ? (
        <form className="space-y-4" onSubmit={sendOtp}>
          <div className="space-y-1.5">
            <Label htmlFor="otp-email">Email</Label>
            <Input
              id="otp-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              aria-describedby="otp-status"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy !== null}>
            {busy === "request" ? "Sending…" : "Send verification code"}
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={verifyOtp}>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              Enter the code sent to {maskAuthEmail(requestedEmail)}.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="otp-code">{AUTH_OTP_LENGTH}-digit verification code</Label>
            <InputOTP
              id="otp-code"
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
          <Button type="submit" className="w-full" disabled={busy !== null || !isCompleteOtp(otp)}>
            {busy === "verify" ? "Verifying…" : "Verify and sign in"}
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
      {message && (
        <p
          id="otp-status"
          className="rounded-md bg-surface-sunken p-3 text-sm text-muted-foreground"
          role="status"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          id="otp-status"
          className="rounded-md bg-critical-surface p-3 text-sm text-critical"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
