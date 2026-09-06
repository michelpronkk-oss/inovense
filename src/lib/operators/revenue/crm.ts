/**
 * Revenue's provider-neutral CRM boundary. Operators deal in people,
 * companies, opportunities and approved activities; only adapters understand
 * a vendor's object model. Salesforce mappings: Person=Lead|Contact,
 * Company=Account, Opportunity=Opportunity. Salesforce support in this file
 * is READ-ONLY (person/company/opportunity lookup) - no Salesforce mutation
 * of any kind exists here or anywhere else in the codebase today.
 */
import { executeHubSpotRevenueActions, findContactByEmail, type PreparedHubSpotActions } from "@/lib/operators/executors/hubspot";
import { getStoredSalesforceCredential } from "@/lib/connectors/salesforce";
import {
  findSalesforcePersonByEmail,
  getOpenSalesforceOpportunitiesForAccount,
  getSalesforceAccountById,
  type SalesforcePersonMatch,
} from "@/lib/connectors/salesforce-rest";

export type RevenueCrmProvider = "hubspot" | "salesforce";
export type RevenueCrmCapability = "person.read" | "company.read" | "opportunity.read" | "contact.write" | "opportunity.write" | "note.create" | "follow_up.create";

export type RevenueCrmPerson = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  /** Present for Salesforce matches: which object type matched. */
  matchType?: "contact" | "lead";
  title?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
  /** Salesforce Contact.AccountId. Null for Leads (no Account relationship). */
  accountId?: string | null;
};

export type RevenueCrmUnsupported = { status: "unsupported"; provider: RevenueCrmProvider; capability: RevenueCrmCapability };
/** More than one record matched the same email - an explicit result, never a silent pick. */
export type RevenueCrmAmbiguous = { status: "ambiguous"; provider: RevenueCrmProvider };
/** The lookup itself failed (network/API error) - distinct from a safe "no match". */
export type RevenueCrmLookupError = { status: "error"; provider: RevenueCrmProvider; message: string };

export type RevenueCrmPersonResult = RevenueCrmPerson | null | RevenueCrmUnsupported | RevenueCrmAmbiguous | RevenueCrmLookupError;

export type RevenueCrmCompany = {
  id: string | null;
  name: string | null;
  website: string | null;
  industry: string | null;
  ownerId: string | null;
  ownerName: string | null;
};

export type RevenueCrmOpportunity = {
  id: string;
  name: string | null;
  stage: string | null;
  isClosed: boolean;
  amount: number | null;
  closeDate: string | null;
  ownerId: string | null;
  ownerName: string | null;
};

export type RevenueCrmMatchStatus = "matched" | "no_match" | "unsupported" | "error";

export type RevenueCrmOpportunityContext = {
  companyMatchStatus: RevenueCrmMatchStatus;
  company: RevenueCrmCompany | null;
  opportunityMatchStatus: RevenueCrmMatchStatus;
  opportunities: RevenueCrmOpportunity[];
  fallbackReason: string | null;
};

export interface RevenueCrmAdapter {
  readonly provider: RevenueCrmProvider;
  supports(capability: RevenueCrmCapability): boolean;
  findPersonByEmail(workspaceId: string, email: string): Promise<RevenueCrmPersonResult>;
  /**
   * Read-only company + open-opportunity context for an already-matched
   * person. Never a write trigger. Optional because not every adapter
   * implements company/opportunity read today.
   */
  getOpportunityContext?(workspaceId: string, person: RevenueCrmPerson): Promise<RevenueCrmOpportunityContext | RevenueCrmUnsupported>;
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

function normalizeSalesforcePerson(match: SalesforcePersonMatch): RevenueCrmPerson {
  return {
    id: match.id,
    email: match.email,
    firstName: match.firstName,
    lastName: match.lastName,
    companyName: match.companyName,
    matchType: match.type,
    title: match.title,
    ownerId: match.ownerId,
    ownerName: match.ownerName,
    accountId: match.accountId,
  };
}

const SALESFORCE_READ_CAPABILITIES: RevenueCrmCapability[] = ["person.read", "company.read", "opportunity.read"];

const salesforceAdapter: RevenueCrmAdapter = {
  provider: "salesforce",
  // Read-only in this pass. Every write capability stays false until a real
  // implementation exists - do not flip these without adding an actual
  // Salesforce mutation path (and the approval gating that would require).
  supports: (capability) => SALESFORCE_READ_CAPABILITIES.includes(capability),
  async findPersonByEmail(workspaceId, email) {
    const credential = await getStoredSalesforceCredential(workspaceId);
    if (!credential) return { status: "unsupported", provider: "salesforce", capability: "person.read" };
    const result = await findSalesforcePersonByEmail({ workspaceId, credential, email });
    if (result.status === "matched") return normalizeSalesforcePerson(result.person);
    if (result.status === "ambiguous") return { status: "ambiguous", provider: "salesforce" };
    if (result.status === "error") return { status: "error", provider: "salesforce", message: result.message };
    return null;
  },
  async getOpportunityContext(workspaceId, person) {
    const credential = await getStoredSalesforceCredential(workspaceId);
    if (!credential) return { status: "unsupported", provider: "salesforce", capability: "company.read" };

    // Contact path: Opportunities relate to Accounts, not directly to
    // Contacts, so route through the Contact's resolved Account.
    if (person.accountId) {
      const accountResult = await getSalesforceAccountById({ workspaceId, credential, accountId: person.accountId });
      if (accountResult.status === "error") {
        return { companyMatchStatus: "error", company: null, opportunityMatchStatus: "error", opportunities: [], fallbackReason: accountResult.message };
      }
      if (accountResult.status === "no_match") {
        return { companyMatchStatus: "no_match", company: null, opportunityMatchStatus: "no_match", opportunities: [], fallbackReason: null };
      }
      const company: RevenueCrmCompany = {
        id: accountResult.account.id,
        name: accountResult.account.name,
        website: accountResult.account.website,
        industry: accountResult.account.industry,
        ownerId: accountResult.account.ownerId,
        ownerName: accountResult.account.ownerName,
      };
      const opportunityResult = await getOpenSalesforceOpportunitiesForAccount({ workspaceId, credential, accountId: accountResult.account.id });
      if (opportunityResult.status === "error") {
        return { companyMatchStatus: "matched", company, opportunityMatchStatus: "error", opportunities: [], fallbackReason: opportunityResult.message };
      }
      if (opportunityResult.status === "no_match") {
        return { companyMatchStatus: "matched", company, opportunityMatchStatus: "no_match", opportunities: [], fallbackReason: null };
      }
      return {
        companyMatchStatus: "matched",
        company,
        opportunityMatchStatus: "matched",
        opportunities: opportunityResult.opportunities.map((opportunity) => ({
          id: opportunity.id,
          name: opportunity.name,
          stage: opportunity.stage,
          isClosed: opportunity.isClosed,
          amount: opportunity.amount,
          closeDate: opportunity.closeDate,
          ownerId: opportunity.ownerId,
          ownerName: opportunity.ownerName,
        })),
        fallbackReason: null,
      };
    }

    // Lead path: use the Lead's plain Company string as lightweight company
    // context. Leads have no Account relationship, so no Opportunity lookup
    // is attempted for them - never invent an Account for a Lead.
    if (person.companyName) {
      return {
        companyMatchStatus: "matched",
        company: { id: null, name: person.companyName, website: null, industry: null, ownerId: null, ownerName: null },
        opportunityMatchStatus: "unsupported",
        opportunities: [],
        fallbackReason: "salesforce_lead_has_no_account_relationship",
      };
    }

    return { companyMatchStatus: "no_match", company: null, opportunityMatchStatus: "no_match", opportunities: [], fallbackReason: null };
  },
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

export function isRevenueCrmAmbiguous(value: unknown): value is RevenueCrmAmbiguous {
  return Boolean(value && typeof value === "object" && (value as { status?: string }).status === "ambiguous");
}

export function isRevenueCrmLookupError(value: unknown): value is RevenueCrmLookupError {
  return Boolean(value && typeof value === "object" && (value as { status?: string }).status === "error");
}
