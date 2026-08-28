import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { validateReviewerLoginRequest } from "../_shared/reviewer-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // The browser opts into reviewer presentation separately. This server gate
  // independently refuses every mock-auth request unless explicitly enabled.
  if (Deno.env.get("REVIEWER_DEMO_MODE") !== "enabled")
    return json({ error: "Reviewer authentication is unavailable." }, 404);

  const expectedCode = Deno.env.get("REVIEWER_DEMO_OTP");
  const reviewerPassword = Deno.env.get("REVIEWER_DEMO_PASSWORD");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!expectedCode || !reviewerPassword || !supabaseUrl || !anonKey)
    return json({ error: "Reviewer authentication is unavailable." }, 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Reviewer sign-in could not be completed." }, 400);
  }

  const input = validateReviewerLoginRequest(body, expectedCode);
  if (!input) return json({ error: "Reviewer sign-in could not be completed." }, 401);

  // This creates a normal Supabase Auth session with the anon client. It does
  // not use a service-role client, create users, or bypass application RLS.
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.signInWithPassword({
    email: input.email,
    password: reviewerPassword,
  });
  if (error || !data.session || !data.user)
    return json({ error: "Reviewer sign-in could not be completed." }, 401);

  return json(
    {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: { id: data.user.id, email: data.user.email },
    },
    200,
  );
});

