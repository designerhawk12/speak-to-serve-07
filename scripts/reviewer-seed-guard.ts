export interface ReviewerSeedGuardInput {
  nodeEnv?: string;
  target?: string;
  confirmation?: string;
  expectedProjectRef?: string;
  supabaseUrl?: string;
  configText: string;
}

export interface ReviewerSeedGuardStatus {
  allowed: boolean;
  target: string | null;
  expectedProjectRef: string | null;
  urlProjectRef: string | null;
  configProjectRef: string | null;
  failures: string[];
}

export function projectRefFromSupabaseUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const host = new URL(value).hostname.toLocaleLowerCase();
    const match = host.match(/^([a-z0-9]+)\.supabase\.co$/u);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function projectRefFromConfig(configText: string): string | null {
  return configText.match(/^project_id\s*=\s*"([a-z0-9]+)"\s*$/mu)?.[1] ?? null;
}

export function reviewerSeedGuardStatus(input: ReviewerSeedGuardInput): ReviewerSeedGuardStatus {
  const expectedProjectRef = input.expectedProjectRef?.trim() || null;
  const urlProjectRef = projectRefFromSupabaseUrl(input.supabaseUrl);
  const configProjectRef = projectRefFromConfig(input.configText);
  const target = input.target?.trim() || null;
  const failures: string[] = [];

  if (input.nodeEnv === "production") failures.push("NODE_ENV is production");
  if (target !== "development") failures.push("DEMO_DATA_TARGET is not development");
  if (input.confirmation !== "development") {
    failures.push("REVIEWER_RESET_CONFIRM is not development");
  }
  if (!expectedProjectRef) failures.push("REVIEWER_DEMO_PROJECT_REF is missing");
  if (!urlProjectRef) failures.push("SUPABASE_URL does not identify a hosted Supabase project");
  if (!configProjectRef) failures.push("supabase/config.toml does not contain a project_id");
  if (expectedProjectRef && urlProjectRef !== expectedProjectRef) {
    failures.push("SUPABASE_URL project ref does not match REVIEWER_DEMO_PROJECT_REF");
  }
  if (expectedProjectRef && configProjectRef !== expectedProjectRef) {
    failures.push("supabase/config.toml project_id does not match REVIEWER_DEMO_PROJECT_REF");
  }

  return {
    allowed: failures.length === 0,
    target,
    expectedProjectRef,
    urlProjectRef,
    configProjectRef,
    failures,
  };
}
