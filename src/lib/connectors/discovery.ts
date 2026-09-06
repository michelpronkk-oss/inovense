import { CONNECTOR_CATEGORY_LABELS, type ConnectorDefinition } from "@/lib/connectors/registry";

export type ConnectorDiscoveryCategory = "all" | "email_calendar" | "crm" | "project_management" | "communication";

export const CONNECTOR_DISCOVERY_CATEGORIES: { key: ConnectorDiscoveryCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "email_calendar", label: "Email & calendar" },
  { key: "crm", label: "CRM" },
  { key: "project_management", label: "Project management" },
  { key: "communication", label: "Communication" },
];

export function connectorDiscoveryCategory(definition: ConnectorDefinition): ConnectorDiscoveryCategory | null {
  if (definition.category === "email" || definition.category === "calendar") return "email_calendar";
  if (definition.category === "crm") return "crm";
  if (definition.category === "project_management") return "project_management";
  if (definition.category === "team_chat") return "communication";
  return null;
}

export function filterConnectorDiscovery(
  definitions: ConnectorDefinition[],
  options: { query?: string; category?: ConnectorDiscoveryCategory; onboardingSystems?: string[] } = {},
): ConnectorDefinition[] {
  const query = options.query?.trim().toLowerCase() ?? "";
  const category = options.category ?? "all";
  const priority = new Set(options.onboardingSystems ?? []);

  return definitions
    .filter((definition) => definition.status === "available")
    .filter((definition) => category === "all" || connectorDiscoveryCategory(definition) === category)
    .filter((definition) => {
      if (!query) return true;
      const haystack = [
        definition.displayName,
        definition.description,
        CONNECTOR_CATEGORY_LABELS[definition.category],
        ...definition.readActions,
        ...definition.writeActions,
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => Number(priority.has(b.connectorKey)) - Number(priority.has(a.connectorKey)) || a.displayName.localeCompare(b.displayName));
}
