import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/cpgrams/session";
import type { UserRole } from "@/lib/cpgrams/types";
import { useState } from "react";

export const Route = createFileRoute("/auth/officer-login")({
  head: () => ({
    meta: [
      { title: "Government Officer Login — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "Sign in as a government officer, nodal supervisor or Appellate Authority to work on grievance cases.",
      },
      { property: "og:title", content: "Government Officer Login" },
      {
        property: "og:description",
        content: "Access the grievance workspace for officers, supervisors and appellate authorities.",
      },
    ],
  }),
  component: OfficerLoginPage,
});

const ROLE_OPTIONS: { value: Exclude<UserRole, "public" | "citizen">; label: string }[] = [
  { value: "officer", label: "Government Officer" },
  { value: "nodal", label: "Nodal / Supervisor" },
  { value: "appellate", label: "Appellate Authority" },
];

function OfficerLoginPage() {
  const { setRole } = useSession();
  const navigate = useNavigate();
  const [role, setRoleValue] = useState<Exclude<UserRole, "public" | "citizen">>("officer");

  return (
    <Card className="border-border">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">Government Officer Login</h1>
          <p className="text-sm text-muted-foreground">
            For officers, nodal supervisors and Appellate Authorities handling grievance cases.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setRole(role);
            navigate({ to: "/office" });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="o-id">Official email or employee ID</Label>
            <Input id="o-id" autoComplete="username" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="o-password">Password</Label>
            <Input id="o-password" type="password" autoComplete="current-password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="o-role">Sign in as</Label>
            <Select value={role} onValueChange={(v) => setRoleValue(v as typeof role)}>
              <SelectTrigger id="o-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>

        <p className="text-sm text-muted-foreground">
          Are you a citizen?{" "}
          <Link to="/auth/login" className="font-medium text-primary hover:underline">
            Citizen Login
          </Link>
        </p>

        <p className="rounded-md bg-surface-sunken p-3 text-xs text-muted-foreground">
          Official authentication is not connected yet. Role selection here only previews the workspace.
        </p>
      </CardContent>
    </Card>
  );
}
