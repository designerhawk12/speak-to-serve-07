import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Landmark } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-sunken">
      <div className="gov-band">
        <div className="page-container flex h-8 items-center text-[11px] font-medium">
          Government of India · Public Grievance Redress
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          <Link to="/" className="focus-ring flex items-center justify-center gap-3 rounded-md">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Landmark className="size-5" aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold">CPGRAMS</span>
              <span className="block text-[11px] text-muted-foreground">Resolution Workspace</span>
            </span>
          </Link>
          {/* Required: nested auth routes render here. */}
          <Outlet />
        </div>
      </div>
    </div>
  );
}
