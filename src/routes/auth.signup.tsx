import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_FEATURES } from "@/lib/cpgrams/auth-config";
import { roleHomePath } from "@/lib/cpgrams/auth-routing";
import { citizenSignupMetadata } from "@/lib/cpgrams/auth-workflows";
import { useSession } from "@/lib/cpgrams/session";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({ meta: [{ title: "Create a citizen account — CPGRAMS Resolution Workspace" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const options = {
      data: citizenSignupMetadata(name, phone),
      ...(AUTH_FEATURES.emailConfirmation ? { emailRedirectTo: `${window.location.origin}/auth/login` } : {}),
    };
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options,
    });
    if (signUpError) {
      setError("We could not create your account. Please check the details and try again.");
      setBusy(false);
      return;
    }
    if (data.user && data.session) {
      const profile = await refreshProfile(data.user);
      if (profile) await navigate({ to: roleHomePath(profile.role) });
      else setError("Your account was created, but its workspace profile is not available yet. Please sign in again shortly.");
    } else {
      setError(
        AUTH_FEATURES.developmentMode
          ? "We could not start your session. Development sign-up requires Supabase Confirm Email to be disabled."
          : "Check your email to confirm your account, then return here to sign in.",
      );
    }
    setBusy(false);
  };

  return (
    <Card className="border-border">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1"><h1 className="text-xl font-bold">Create a citizen account</h1><p className="text-sm text-muted-foreground">Your grievances will remain linked to your account.</p></div>
        <form className="space-y-4" onSubmit={signUp}>
          <div className="space-y-1.5"><Label htmlFor="name">Full name</Label><Input id="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></div>
          <div className="space-y-1.5"><Label htmlFor="signup-email">Email</Label><Input id="signup-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
          <div className="space-y-1.5"><Label htmlFor="phone">Mobile number (optional)</Label><Input id="phone" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="signup-password">Create a password</Label><Input id="signup-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating account…" : "Create account"}</Button>
        </form>
        {error && <p className="rounded-md bg-critical-surface p-3 text-sm text-critical" role="alert">{error}</p>}
        <p className="text-sm text-muted-foreground">Already registered? <Link to="/auth/login" className="font-medium text-primary hover:underline">Sign in</Link></p>
      </CardContent>
    </Card>
  );
}
