import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/cpgrams/session";

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Citizen login — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "Sign in as a citizen to see all your grievances, updates and appeals in one place.",
      },
      { property: "og:title", content: "Citizen login" },
      { property: "og:description", content: "Sign in to see your grievances and appeals." },
    ],
  }),
  component: CitizenLoginPage,
});

function CitizenLoginPage() {
  const { setRole } = useSession();
  const navigate = useNavigate();

  return (
    <Card className="border-border">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">Citizen login</h1>
          <p className="text-sm text-muted-foreground">
            Once signed in, your grievances appear automatically — you never need a registration number.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setRole("citizen");
            navigate({ to: "/citizen" });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="mobile">Mobile number or email</Label>
            <Input id="mobile" autoComplete="username" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" />
          </div>
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>

        <div className="space-y-2 text-sm">
          <p>
            <Link to="/auth/forgot-password" className="font-medium text-primary hover:underline">
              Forgot your password?
            </Link>
          </p>
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

        <p className="rounded-md bg-surface-sunken p-3 text-xs text-muted-foreground">
          Authentication is not connected yet. Signing in here switches the demo role so you can review
          the citizen experience.
        </p>
      </CardContent>
    </Card>
  );
}
