import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmailOtpLogin } from "@/components/cpgrams/EmailOtpLogin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/cpgrams/PasswordField";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_FEATURES } from "@/lib/cpgrams/auth-config";
import { roleHomePath } from "@/lib/cpgrams/auth-routing";
import { passwordSignInErrorMessage, validatePasswordLogin } from "@/lib/cpgrams/auth-workflows";
import { useSession } from "@/lib/cpgrams/session";

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Citizen login — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "Sign in to see your grievances, updates and appeals in one place.",
      },
    ],
  }),
  component: CitizenLoginPage,
});

function CitizenLoginPage() {
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
        "Your account was signed in, but its workspace profile could not be loaded. Please contact support.",
      );
      return;
    }
    await navigate({ to: roleHomePath(profile.role) });
  };

  const signInWithPassword = async (event: FormEvent<HTMLFormElement>) => {
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

  const passwordForm = (
    <form className="space-y-4" onSubmit={signInWithPassword}>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <PasswordField
        id="password"
        label="Password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        required
        helpText="Use the password for this account."
      />
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );

  return (
    <Card className="border-border">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">Citizen login</h1>
          <p className="text-sm text-muted-foreground">
            Once signed in, your grievances appear automatically.
          </p>
        </div>

        {AUTH_FEATURES.emailOtp ? (
          <Tabs defaultValue="otp" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="otp">Email code</TabsTrigger>
            </TabsList>
            <TabsContent value="password">{passwordForm}</TabsContent>
            <TabsContent value="otp">
              <EmailOtpLogin onAuthenticated={finishSignIn} />
            </TabsContent>
          </Tabs>
        ) : (
          passwordForm
        )}
        {error && (
          <p className="rounded-md bg-critical-surface p-3 text-sm text-critical" role="alert">
            {error}
          </p>
        )}

        <div className="space-y-2 text-sm">
          {AUTH_FEATURES.passwordRecovery && (
            <p>
              <Link
                to="/auth/forgot-password"
                search={{ recovery: false }}
                className="font-medium text-primary hover:underline"
              >
                Forgot your password?
              </Link>
            </p>
          )}
          <p className="text-muted-foreground">
            New here?{" "}
            <Link to="/auth/signup" className="font-medium text-primary hover:underline">
              Create a citizen account
            </Link>
          </p>
          <p className="text-muted-foreground">
            Government staff?{" "}
            <Link to="/auth/officer-login" className="font-medium text-primary hover:underline">
              Government Officer Login
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
