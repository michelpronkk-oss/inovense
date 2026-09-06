/**
 * Revenue's provider-neutral CRM boundary. Operators deal in people,
 * companies, opportunities and approved activities; only adapters understand
 * a vendor's object model. Salesforce mappings are intentionally contracts
 * only: Person=Lead|Contact, Company=Account, Opportunity=Opportunity,
 * Follow-up=Task, and Note=Salesforce activity mechanism (to confirm).
 */
import { executeHubSpotRevenueActions, findContactByEmail, type PreparedHubSpotActions } from "@/lib/operators/executors/hubspot";

export type RevenueCrmProvider = "hubspot" | "salesforce";
export type RevenueCrmCapability = "person.read" | "company.read" | "opportunity.read" | "contact.write" | "opportunity.write" | "note.create" | "follow_up.create";
export type RevenueCrmPerson = { id: string; email: string | null; firstName: string | null; lastName: string | null; companyName: string | null };
export type RevenueCrmUnsupported = { status: "unsupported"; provider: RevenueCrmProvider; capability: RevenueCrmCapability };

export interface RevenueCrmAdapter {
  readonly provider: RevenueCrmProvider;
  supports(capability: RevenueCrmCapability): boolean;
  findPersonByEmail(workspaceId: string, email: string): Promise<RevenueCrmPerson | null | RevenueCrmUnsupported>;
  /** Approval is enforced by the caller before an adapter performs a write. */
  executeApprovedRevenueActions?(workspaceId: string, payload: { to?: string; subject?: string; crmPreparation?: Record<string, unknown> | null; preparedActions?: PreparedHubSpotActions | null }): Promise<unknown | RevenueCrmUnsupported>;
}

const hubspotAdapter: RevenueCrmAdapter = {
  provider: "hubspot",
  supports: (capability) => ["person.read", "contact.write", "opportunity.write", "note.create", "follow_up.create"].includes(capability),
  async findPersonByEmail(workspaceId, email) {
    const contact = await findContactByEmail(workspaceId, email);
    if (!contact) return null;
    const properties = contact.properties ?? {};
    return { id: contact.id ?? "", email: typeof properties.email === "string" ? properties.email : null, firstName: typeof properties.firstname === "string" ? properties.firstname : null, lastName: typeof properties.lastname === "string" ? properties.lastname : null, companyName: typeof properties.company === "string" ? properties.company : null };
  },
  executeApprovedRevenueActions(workspaceId, payload) {
    return executeHubSpotRevenueActions(workspaceId, { ...payload, preparedHubSpotActions: payload.preparedActions });
  },
};

const salesforceAdapter: RevenueCrmAdapter = {
  provider: "salesforce",
  supports: () => false,
  async findPersonByEmail() { return { status: "unsupported", provider: "salesforce", capability: "person.read" }; },
  async executeApprovedRevenueActions() { return { status: "unsupported", provider: "salesforce", capability: "contact.write" }; },
};

export function getRevenueCrmAdapter(provider: RevenueCrmProvider | null): RevenueCrmAdapter | null {
  if (provider === "hubspot") return hubspotAdapter;
  if (provider === "salesforce") return salesforceAdapter;
  return null;
}

export function isRevenueCrmUnsupported(value: unknown): value is RevenueCrmUnsupported {
  return Boolean(value && typeof value === "object" && (value as { status?: string }).status === "unsupported");
}
