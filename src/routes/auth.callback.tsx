import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ErrorState, LoadingState } from "@/components/cpgrams";
import { supabase } from "@/integrations/supabase/client";
import { completeAuthCallback } from "@/lib/cpgrams/auth-workflows";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void completeAuthCallback(window.location.href, supabase.auth)
      .then(({ kind }) =>
        navigate({
          to: kind === "recovery" ? "/auth/forgot-password" : "/auth/login",
          ...(kind === "recovery" ? { search: { recovery: "1" } } : {}),
          replace: true,
        }),
      )
      .catch((callbackError) =>
        setError(
          callbackError instanceof Error
            ? callbackError.message
            : "We could not complete the secure email link. Please request a new link and try again.",
        ),
      );
  }, [navigate]);

  if (error) return <ErrorState title="Email link could not be completed" description={error} />;
  return <LoadingState label="Completing your secure email link" />;
}
