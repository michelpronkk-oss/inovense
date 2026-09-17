import type { OperatorKey } from "@/lib/operators/registry";

/** The live operators with shared product state. Other registry entries remain previews/planned. */
export const REAL_OPERATOR_KEYS: OperatorKey[] = ["growth", "revenue", "client_flow", "operations", "support"];
