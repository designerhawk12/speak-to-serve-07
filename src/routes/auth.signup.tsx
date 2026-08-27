import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/cpgrams/PasswordField";
import { supabase } from "@/integrations/supabase/client";
import { roleHomePath } from "@/lib/cpgrams/auth-routing";
import { citizenSignupMetadata, signupDisposition } from "@/lib/cpgrams/auth-workflows";
import { authCallbackUrl } from "@/lib/cpgrams/auth-url";
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
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  const signUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setPendingConfirmation(false);
    const options = {
      data: citizenSignupMetadata(name.trim(), phone.trim(), { gender, address: address.trim() }),
      emailRedirectTo: authCallbackUrl("confirmation"),
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
    if (
      signupDisposition({ hasUser: Boolean(data.user), hasSession: Boolean(data.session) }) ===
        "signed_in" &&
      data.user
    ) {
      const profile = await refreshProfile(data.user);
      if (profile) await navigate({ to: roleHomePath(profile.role) });
      else
        setError(
          "Your account was created, but its workspace profile is not available yet. Please sign in again shortly.",
        );
    } else if (
      signupDisposition({ hasUser: Boolean(data.user), hasSession: Boolean(data.session) }) ===
      "confirmation_required"
    ) {
      setError(null);
      setPendingConfirmation(true);
    } else {
      setError("We could not create your account. Please check the details and try again.");
    }
    setBusy(false);
  };

  return (
    <Card className="border-border">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">Create a citizen account</h1>
          <p className="text-sm text-muted-foreground">
            Your grievances will remain linked to your account.
          </p>
        </div>
        {pendingConfirmation && (
          <p className="rounded-md bg-info-surface p-3 text-sm text-info" role="status">
            Check your email to confirm your account. The secure link will return you to this
            CPGRAMS website.
          </p>
        )}
        <form className="space-y-4" onSubmit={signUp}>
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Mobile number</Label>
            <Input
              id="phone"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gender">Gender (optional)</Label>
            <Input
              id="gender"
              autoComplete="sex"
              value={gender}
              onChange={(event) => setGender(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Basic location or address (optional)</Label>
            <Input
              id="address"
              autoComplete="street-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </div>
          <PasswordField
            id="signup-password"
            label="Create a password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            minLength={8}
            required
            helpText="Use at least 8 characters."
          />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </Button>
        </form>
        {error && (
          <p className="rounded-md bg-critical-surface p-3 text-sm text-critical" role="alert">
            {error}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Already registered?{" "}
          <Link to="/auth/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
