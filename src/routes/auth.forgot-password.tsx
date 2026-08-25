import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "Request a reset link or OTP to regain access to your citizen account.",
      },
      { property: "og:title", content: "Reset your password" },
      { property: "og:description", content: "Regain access to your citizen account." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <Card className="border-border">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">Reset your password</h1>
          <p className="text-sm text-muted-foreground">
            Enter the mobile number or email registered with your account and we will send a reset code.
          </p>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-1.5">
            <Label htmlFor="f-id">Mobile number or email</Label>
            <Input id="f-id" autoComplete="username" />
          </div>
          <Button type="submit" className="w-full">
            Send reset code
          </Button>
        </form>

        <p className="text-sm text-muted-foreground">
          <Link to="/auth/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>

        <p className="rounded-md bg-surface-sunken p-3 text-xs text-muted-foreground">
          Password recovery is not connected yet.
        </p>
      </CardContent>
    </Card>
  );
}
