import { Navigate, createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LoadingState } from "@/components/cpgrams/LoadingState";
import { roleHomePath } from "@/lib/cpgrams/auth-routing";
import { useLanguage } from "@/lib/cpgrams/language-context";
import { useSession } from "@/lib/cpgrams/session";

import { Landmark } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});

function AuthLayout() {
  const { session, user, isLoading, profileState } = useSession();
  const { t } = useLanguage();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const isRecoveryRoute = pathname === "/auth/forgot-password" || pathname === "/auth/callback";

  if (!isRecoveryRoute && (isLoading || (session && profileState === "loading"))) {
    return <LoadingState label={t("auth.restoringSession")} />;
  }

  // A verified recovery OTP creates a normal Supabase session before the user
  // sets the new password, so this route must remain mounted for that step.
  if (user && !isRecoveryRoute) return <Navigate to={roleHomePath(user.role)} replace />;

  return (
    <div className="flex min-h-screen flex-col bg-surface-sunken">
      <div className="gov-band">
        <div className="page-container flex min-h-8 items-center justify-between gap-3 text-[11px] font-medium">
          <span>{t("brand.governmentBand")}</span>

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
              <span className="block text-[11px] text-muted-foreground">
                {t("brand.workspace")}
              </span>
            </span>
          </Link>
          {/* Required: nested auth routes render here. */}
          <Outlet />
        </div>
      </div>
    </div>
  );
}
