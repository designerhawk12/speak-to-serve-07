import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/cpgrams/PasswordField";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailOtpLogin } from "@/components/cpgrams/EmailOtpLogin";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_FEATURES } from "@/lib/cpgrams/auth-config";
import { roleHomePath } from "@/lib/cpgrams/auth-routing";
import { passwordSignInErrorMessage, validatePasswordLogin } from "@/lib/cpgrams/auth-workflows";
import { useSession } from "@/lib/cpgrams/session";

export const Route = createFileRoute("/auth/officer-login")({
  head: () => ({ meta: [{ title: "Government Officer Login — CPGRAMS Resolution Workspace" }] }),
  component: OfficerLoginPage,
});

function OfficerLoginPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finishSignIn = async (authUser: Parameters<typeof refreshProfile>[0]) => {
    if (!authUser) return;
    const profile = await refreshProfile(authUser);
    if (!profile) {
      setError(
        "Your account was signed in, but its workspace profile could not be loaded. Please contact the platform administrator.",
      );
      return;
    }
    await navigate({ to: roleHomePath(profile.role) });
  };

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validatePasswordLogin(email, password);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError || !data.user) {
      setError(passwordSignInErrorMessage(signInError));
      setBusy(false);
      return;
    }
    await finishSignIn(data.user);
    setBusy(false);
  };

  return (
    <Card className="border-border">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">Government Officer Login</h1>
          <p className="text-sm text-muted-foreground">
            For officers, nodal supervisors, and Appellate Authorities handling grievance cases.
          </p>
        </div>
        {AUTH_FEATURES.emailOtp ? (
          <Tabs defaultValue="otp" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="otp">Email code</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>
            <TabsContent value="otp">
              <EmailOtpLogin onAuthenticated={finishSignIn} />
            </TabsContent>
            <TabsContent value="password">
              <form className="space-y-4" onSubmit={signIn}>
                <div className="space-y-1.5">
                  <Label htmlFor="officer-email">Official email</Label>
                  <Input
                    id="officer-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <PasswordField
                  id="officer-password"
                  label="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={setPassword}
                  required
                  helpText="Use the password for your official account."
                />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        ) : (
          <form className="space-y-4" onSubmit={signIn}>
            <div className="space-y-1.5">
              <Label htmlFor="officer-email">Official email</Label>
              <Input
                id="officer-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <PasswordField
              id="officer-password"
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              required
              helpText="Use the password for your official account."
            />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        )}
        {error && (
          <p className="rounded-md bg-critical-surface p-3 text-sm text-critical" role="alert">
            {error}
          </p>
        )}
        <p className="rounded-md bg-surface-sunken p-3 text-xs text-muted-foreground">
          Your workspace role is assigned by your authorized profile. It cannot be selected at sign
          in.
        </p>
        <p className="text-sm">
          <Link
            to="/auth/forgot-password"
            search={{ recovery: false }}
            className="font-medium text-primary hover:underline"
          >
            Forgot your password?
          </Link>
        </p>
        <p className="text-sm text-muted-foreground">
          Are you a citizen?{" "}
          <Link to="/auth/login" className="font-medium text-primary hover:underline">
            Citizen Login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
