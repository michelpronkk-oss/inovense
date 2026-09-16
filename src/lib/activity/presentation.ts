/**
 * Presentation-only helpers shared by the dashboard's "Recent activity" card
 * and the full Activity page, so both surfaces render operator identity and
 * activity copy the same way. No data shaping/business logic lives here -
 * the normalized activity records themselves are untouched.
 */

export function operatorDisplayName(key: string | null | undefined): string {
  return key ? key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Auterim system";
}

export function operatorInitials(key: string | null | undefined): string {
  if (!key) return "A";
  return key.split("_").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Activity titles/descriptions are sometimes authored with the operator's
 * own display name already at the front (e.g. "Revenue completed a run").
 * The row also shows that name once, structurally, next to an avatar - so
 * this strips a leading, case-insensitive match of the name before the
 * remaining text is shown beside it, instead of showing the name twice.
 * Text that doesn't start with the name is returned unchanged.
 */
export function withoutLeadingOperatorName(operatorName: string, text: string): string {
  const pattern = new RegExp(`^${escapeRegExp(operatorName)}\\s+`, "i");
  const stripped = text.replace(pattern, "");
  if (!stripped || stripped === text) return text;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

/**
 * The activity category is an internal event-shape identifier
 * ("operator_run", "execution"), not customer-facing language. This maps
 * each known category to the plain operational word an operator already
 * sees used elsewhere in the product (the Activity metric strip, for
 * example, already calls `execution` "Actions"), so the row badge reads
 * as a description rather than a raw event name. Unknown categories still
 * fall back to a de-slugged label instead of breaking.
 */
const CATEGORY_LABELS: Record<string, string> = {
  operator_run: "Run",
  workflow: "Workflow",
  approval: "Approval",
  execution: "Action",
  outcome: "Outcome",
  connector: "Connector",
  failure: "Failure",
  system: "System",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
