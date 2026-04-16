import { createSupabaseServerClient } from "@/lib/supabase-server";

export type ActivityEventInput = {
  actorIdentifier?: string | null;
  entityType: string;
  entityId: string;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  market?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logActivityEvent(input: ActivityEventInput): Promise<void> {
  const supabase = createSupabaseServerClient();
  const payload = {
    actor_identifier: input.actorIdentifier ?? null,
    entity_type: input.entityType,
    entity_id: input.entityId,
    event_type: input.eventType,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus ?? null,
    market: input.market ?? null,
    metadata: input.metadata ?? {},
  };

  const { error } = await supabase.from("activity_events").insert(payload);
  if (error) {
    throw new Error(error.message);
  }
}

export async function logActivityEventSafe(input: ActivityEventInput): Promise<void> {
  try {
    await logActivityEvent(input);
  } catch (err) {
    console.error("[activity-events] failed to write event:", err);
  }
}
