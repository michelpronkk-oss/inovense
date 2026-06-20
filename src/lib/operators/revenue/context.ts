import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type RevenueMemoryExample = {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string | null;
};

export type RevenueCompanyGraphContext = {
  workspaceId: string;
  companyName: string | null;
  website: string | null;
  offerSummary: string | null;
  toneOfVoice: string | null;
  pricingRules: string[];
  policies: {
    approvalPolicy: Record<string, unknown>;
    bannedClaims: string[];
  };
  approvedExamples: RevenueMemoryExample[];
  rejectedExamples: RevenueMemoryExample[];
  recentSuccessfulApprovalLearnings: RevenueMemoryExample[];
  recentRejectionLearnings: RevenueMemoryExample[];
  memoryKeysUsed: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const text = asString(value);
    if (text) return text;
  }
  return null;
}

function compactExample(row: Record<string, unknown>): RevenueMemoryExample {
  return {
    id: String(row.id ?? ""),
    title: asString(row.title) ?? "Revenue memory",
    content: asString(row.content)?.slice(0, 900) ?? "",
    metadata: asRecord(row.metadata),
    createdAt: asString(row.created_at),
  };
}

export async function loadRevenueCompanyGraphContext(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
}): Promise<RevenueCompanyGraphContext> {
  const memoryKeysUsed = new Set<string>();

  const [workspaceRes, settingsRes, snapshotRes, memoryRes] = await Promise.all([
    input.supabase
      .from("os_workspaces")
      .select("id,name")
      .eq("id", input.workspaceId)
      .maybeSingle(),
    input.supabase
      .from("os_workspace_settings")
      .select("approval_policy,notifications")
      .eq("workspace_id", input.workspaceId)
      .maybeSingle(),
    input.supabase
      .from("os_state_snapshots")
      .select("state")
      .eq("workspace_id", input.workspaceId)
      .maybeSingle(),
    input.supabase
      .from("os_operator_memory")
      .select("id,memory_type,title,content,metadata,approval_status,created_at")
      .eq("workspace_id", input.workspaceId)
      .eq("operator_key", "revenue")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const snapshotState = asRecord(snapshotRes.data?.state);
  const onboarding = asRecord(snapshotState.onboarding);
  const settings = asRecord(snapshotState.settings);
  const workspaceSettings = asRecord(settings.workspace);
  const approvalPolicy = {
    ...asRecord(settingsRes.data?.approval_policy),
    ...asRecord(settings.approvalPolicy),
  };

  const companyName = firstString(
    workspaceRes.data?.name,
    onboarding.companyName,
    workspaceSettings.name,
  );
  const website = firstString(onboarding.websiteUrl, workspaceSettings.websiteUrl);

  const memoryRows = (memoryRes.data ?? []).map((row) => row as Record<string, unknown>);
  const approvedRows = memoryRows.filter((row) => row.approval_status === "approved");
  const rejectedRows = memoryRows.filter((row) => row.approval_status === "rejected");

  memoryRows.forEach((row) => {
    const id = asString(row.id);
    const memoryType = asString(row.memory_type);
    if (id) memoryKeysUsed.add(`os_operator_memory:${id}`);
    if (memoryType) memoryKeysUsed.add(`memory_type:${memoryType}`);
  });
  if (settingsRes.data) memoryKeysUsed.add("os_workspace_settings:approval_policy");
  if (snapshotRes.data) memoryKeysUsed.add("os_state_snapshots:onboarding_profile");
  if (workspaceRes.data) memoryKeysUsed.add("os_workspaces:name");

  const approvedExamples = approvedRows.slice(0, 5).map(compactExample);
  const rejectedExamples = rejectedRows.slice(0, 5).map(compactExample);

  const profile = asRecord(onboarding.profile);
  const brand = asRecord(onboarding.brand);
  const memoryMetadata = memoryRows.map((row) => asRecord(row.metadata));

  const offerSummary = firstString(
    onboarding.offer,
    onboarding.products,
    onboarding.services,
    profile.offer,
    profile.services,
    memoryMetadata.find((item) => asString(item.offerSummary))?.offerSummary,
  );
  const toneOfVoice = firstString(
    onboarding.toneOfVoice,
    brand.toneOfVoice,
    memoryMetadata.find((item) => asString(item.toneOfVoice))?.toneOfVoice,
  );
  const pricingRules = [
    ...asStringArray(onboarding.pricingRules),
    ...asStringArray(profile.pricingRules),
    ...memoryMetadata.flatMap((item) => asStringArray(item.pricingRules)),
  ].slice(0, 8);
  const bannedClaims = [
    ...asStringArray(approvalPolicy.bannedClaims),
    ...asStringArray(profile.bannedClaims),
    ...memoryMetadata.flatMap((item) => asStringArray(item.bannedClaims)),
  ].slice(0, 12);

  return {
    workspaceId: input.workspaceId,
    companyName,
    website,
    offerSummary,
    toneOfVoice,
    pricingRules,
    policies: {
      approvalPolicy,
      bannedClaims,
    },
    approvedExamples,
    rejectedExamples,
    recentSuccessfulApprovalLearnings: approvedExamples,
    recentRejectionLearnings: rejectedExamples,
    memoryKeysUsed: Array.from(memoryKeysUsed).slice(0, 30),
  };
}
