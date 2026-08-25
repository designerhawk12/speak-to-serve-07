import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [
      { title: "Create a citizen account — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "Create an account so every grievance you lodge stays linked to you automatically.",
      },
      { property: "og:title", content: "Create a citizen account" },
      {
        property: "og:description",
        content: "Keep all your grievances, updates and appeals in one place.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  return (
    <Card className="border-border">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">Create a citizen account</h1>
          <p className="text-sm text-muted-foreground">
            You only need this once. After that, describing a problem takes a few minutes.
          </p>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" autoComplete="name" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-mobile">Mobile number</Label>
              <Input id="s-mobile" inputMode="tel" autoComplete="tel" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-email">Email (optional)</Label>
              <Input id="s-email" type="email" autoComplete="email" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-password">Create a password</Label>
            <Input id="s-password" type="password" autoComplete="new-password" />
          </div>
          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>

        <p className="text-sm text-muted-foreground">
          Already registered?{" "}
          <Link to="/auth/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>

        <p className="rounded-md bg-surface-sunken p-3 text-xs text-muted-foreground">
          Account creation is not connected yet. It will be handled by the backend.
        </p>
      </CardContent>
    </Card>
  );
}
