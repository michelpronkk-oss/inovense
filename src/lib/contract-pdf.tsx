import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export type ContractType = "project" | "retainer" | "collaboration";

export interface ContractData {
  contractType: ContractType;
  clientName: string;
  companyName: string;
  clientEmail: string;
  serviceLane: string;
  engagementTitle: string;
  startDate: string;
  scopeSummary: string;
  totalValue: string;
  depositAmount: string;
  paymentTerms: string;
  additionalNotes: string;
  effectiveDate: string;
}

/* ─── Constants ─────────────────────────────────────────────────────────── */

const CONTRACT_TITLES: Record<ContractType, string> = {
  project: "Project Agreement",
  retainer: "Retainer Agreement",
  collaboration: "Collaboration and Partner Agreement",
};

const CONTRACT_TYPE_TAGS: Record<ContractType, string> = {
  project: "One-time project engagement",
  retainer: "Ongoing monthly engagement",
  collaboration: "Collaboration and partnership",
};

const TEAL = "#49A0A4";
const TEXT_PRIMARY = "#111111";
const TEXT_SECONDARY = "#52525b";
const TEXT_MUTED = "#71717a";
const BORDER = "#e4e4e7";

/* ─── Clauses ───────────────────────────────────────────────────────────── */

const PROJECT_CLAUSES = [
  {
    title: "Services and Delivery",
    text: "Inovense will deliver the scope of work described above according to the agreed timeline and specifications. Timely delivery requires the client to provide necessary materials, access, feedback, and approvals within agreed windows. Delays caused by outstanding client inputs may affect the project timeline.",
  },
  {
    title: "Payment",
    text: "The deposit is due before work commences. The remaining balance is due upon project completion or as otherwise agreed. All invoices are payable within 7 days of issue. Inovense reserves the right to pause or withhold delivery if payment obligations are not met.",
  },
  {
    title: "Intellectual Property",
    text: "Upon receipt of full payment, all original work product produced under this agreement transfers to the client. Inovense retains the right to display completed work in its portfolio and marketing materials unless otherwise agreed in writing prior to commencement.",
  },
  {
    title: "Revisions and Scope",
    text: "Two rounds of structured revisions are included per deliverable phase. Additional revisions or work outside the agreed scope will be quoted separately before proceeding. Changes that materially affect the project timeline or cost require a written amendment to this agreement.",
  },
  {
    title: "Confidentiality",
    text: "Both parties agree to keep the other's confidential information, commercial terms, and proprietary materials private during and for 24 months following the conclusion of this engagement.",
  },
  {
    title: "Limitation of Liability",
    text: "Inovense's total liability under this agreement is limited to the total fees paid. Neither party shall be liable for indirect, incidental, or consequential losses arising from this agreement or its performance.",
  },
];

const RETAINER_CLAUSES = [
  {
    title: "Ongoing Services",
    text: "Inovense will provide the services described in the scope section on a monthly ongoing basis. The scope may be reviewed and adjusted by mutual agreement, with 30 days written notice required for significant changes to the service scope or volume.",
  },
  {
    title: "Monthly Billing",
    text: "The monthly retainer fee is due on or before the first business day of each month. Inovense reserves the right to pause services if an invoice remains unpaid for more than 10 days. Fees for any partial month at commencement or termination are prorated.",
  },
  {
    title: "Intellectual Property",
    text: "All completed work product transfers to the client upon receipt of payment. Inovense retains the right to reference completed work in its portfolio and marketing materials unless otherwise agreed in writing.",
  },
  {
    title: "Cancellation",
    text: "Either party may cancel this agreement with 30 days written notice. Fees for the notice period are due in full regardless of whether services are used. No refunds are provided for prepaid periods.",
  },
  {
    title: "Confidentiality",
    text: "Both parties agree to keep the other's confidential information, commercial terms, and proprietary materials private during and for 24 months following the termination of this agreement.",
  },
  {
    title: "Limitation of Liability",
    text: "Inovense's liability is limited to the total fees paid in the 3 months preceding any claim. Neither party shall be liable for indirect, incidental, or consequential losses arising from this agreement.",
  },
];

const COLLABORATION_CLAUSES = [
  {
    title: "Collaboration Scope",
    text: "The parties agree to collaborate on the activities described in the scope above. Each party retains full ownership of its pre-existing intellectual property and independently developed work. Nothing in this agreement transfers pre-existing IP between the parties.",
  },
  {
    title: "Joint Work Product",
    text: "Work product created jointly during the collaboration will be allocated as separately agreed in writing. Neither party may reproduce, license, or assign jointly created work without the express written consent of the other party.",
  },
  {
    title: "Commercial Arrangement",
    text: "Each party's financial obligations are described in the Commercial Terms section above. Any changes to the commercial arrangement require written agreement from both parties before taking effect. Neither party is obligated to incur costs beyond those described herein.",
  },
  {
    title: "Confidentiality",
    text: "Both parties agree to keep the other's proprietary information, strategies, client data, and commercial terms confidential for the duration of this agreement and for 24 months following its termination.",
  },
  {
    title: "Termination",
    text: "Either party may terminate this agreement with 30 days written notice. Any outstanding commercial obligations, including unpaid fees and unreturned assets or materials, remain enforceable following termination.",
  },
  {
    title: "Limitation of Liability",
    text: "Neither party's liability under this agreement shall exceed the total commercial value of the arrangement described herein. Neither party shall be liable for indirect, incidental, or consequential losses.",
  },
];

/* ─── Styles ────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: TEXT_PRIMARY,
    paddingTop: 52,
    paddingBottom: 68,
    paddingHorizontal: 58,
    lineHeight: 1.5,
    backgroundColor: "#ffffff",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  wordmark: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    letterSpacing: 3,
    color: TEXT_PRIMARY,
  },
  wordmarkSub: {
    fontSize: 7,
    color: TEXT_MUTED,
    letterSpacing: 1,
    marginTop: 4,
  },
  headerTag: {
    fontSize: 7.5,
    color: TEAL,
    letterSpacing: 1.5,
    textAlign: "right",
  },
  accentLine: {
    height: 1.5,
    backgroundColor: TEAL,
    marginTop: 10,
    marginBottom: 26,
  },

  // Title block
  titleBlock: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  documentTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    color: TEXT_PRIMARY,
    marginBottom: 5,
  },
  effectiveDate: {
    fontSize: 8.5,
    color: TEXT_MUTED,
  },

  // Section
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: TEAL,
    letterSpacing: 2,
  },
  sectionLine: {
    height: 0.75,
    backgroundColor: BORDER,
    flex: 1,
    marginLeft: 10,
  },

  // Parties
  partiesRow: {
    flexDirection: "row",
  },
  partyBlock: {
    flex: 1,
    paddingRight: 20,
  },
  partyLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: TEXT_MUTED,
    letterSpacing: 1,
    marginBottom: 5,
  },
  partyName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: TEXT_PRIMARY,
    marginBottom: 3,
  },
  partyDetail: {
    fontSize: 8.5,
    color: TEXT_SECONDARY,
    lineHeight: 1.65,
  },

  // Fields
  fieldRow: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "flex-start",
  },
  fieldLabel: {
    width: 120,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: TEXT_MUTED,
    paddingTop: 1,
  },
  fieldValue: {
    flex: 1,
    fontSize: 9,
    color: TEXT_PRIMARY,
    lineHeight: 1.5,
  },

  // Body
  bodyText: {
    fontSize: 9,
    color: TEXT_SECONDARY,
    lineHeight: 1.75,
  },

  // Clause
  clause: {
    marginBottom: 10,
  },
  clauseTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: TEXT_PRIMARY,
    marginBottom: 3,
  },
  clauseText: {
    fontSize: 8.5,
    color: TEXT_SECONDARY,
    lineHeight: 1.7,
  },

  // Signature
  signatureRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  signatureBlock: {
    flex: 1,
    paddingRight: 40,
  },
  signatureLineEl: {
    height: 0.75,
    backgroundColor: "#d4d4d8",
    marginTop: 34,
    marginBottom: 7,
  },
  signatureFieldLabel: {
    fontSize: 7.5,
    color: TEXT_MUTED,
    letterSpacing: 0.5,
  },
  signatureName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: TEXT_PRIMARY,
    marginTop: 5,
  },
  signatureDetail: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 58,
    right: 58,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 0.75,
    borderTopColor: BORDER,
  },
  footerText: {
    fontSize: 7,
    color: "#a1a1aa",
  },
});

/* ─── Sub-components ────────────────────────────────────────────────────── */

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title.toUpperCase()}</Text>
      <View style={s.sectionLine} />
    </View>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value}</Text>
    </View>
  );
}

/* ─── Document ──────────────────────────────────────────────────────────── */

export function ContractDocument({ data }: { data: ContractData }) {
  const clauses =
    data.contractType === "project"
      ? PROJECT_CLAUSES
      : data.contractType === "retainer"
        ? RETAINER_CLAUSES
        : COLLABORATION_CLAUSES;

  return (
    <Document
      title={`${CONTRACT_TITLES[data.contractType]} - ${data.companyName}`}
      author="Inovense"
      creator="Inovense CRM"
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.wordmark}>INOVENSE</Text>
            <Text style={s.wordmarkSub}>Digital Infrastructure</Text>
          </View>
          <Text style={s.headerTag}>
            {CONTRACT_TYPE_TAGS[data.contractType].toUpperCase()}
          </Text>
        </View>

        {/* Teal accent line */}
        <View style={s.accentLine} />

        {/* Document title */}
        <View style={s.titleBlock}>
          <Text style={s.documentTitle}>
            {CONTRACT_TITLES[data.contractType]}
          </Text>
          <Text style={s.effectiveDate}>
            Effective date: {data.effectiveDate}
          </Text>
        </View>

        {/* Parties */}
        <View style={s.section}>
          <SectionHeader title="Parties" />
          <View style={s.partiesRow}>
            <View style={s.partyBlock}>
              <Text style={s.partyLabel}>SERVICE PROVIDER</Text>
              <Text style={s.partyName}>Inovense</Text>
              <Text style={s.partyDetail}>Digital Infrastructure</Text>
              <Text style={s.partyDetail}>hello@inovense.com</Text>
              <Text style={s.partyDetail}>inovense.com</Text>
            </View>
            <View style={s.partyBlock}>
              <Text style={s.partyLabel}>CLIENT</Text>
              <Text style={s.partyName}>{data.clientName}</Text>
              {data.companyName && data.companyName !== data.clientName && (
                <Text style={s.partyDetail}>{data.companyName}</Text>
              )}
              <Text style={s.partyDetail}>{data.clientEmail}</Text>
            </View>
          </View>
        </View>

        {/* Engagement */}
        <View style={s.section}>
          <SectionHeader title="Engagement" />
          <FieldRow label="Service lane" value={data.serviceLane} />
          <FieldRow label="Engagement type" value={data.engagementTitle} />
          <FieldRow label="Start date" value={data.startDate} />
        </View>

        {/* Scope */}
        {data.scopeSummary ? (
          <View style={s.section}>
            <SectionHeader title="Scope of Work" />
            <Text style={s.bodyText}>{data.scopeSummary}</Text>
          </View>
        ) : null}

        {/* Commercial terms */}
        {(data.totalValue || data.depositAmount || data.paymentTerms) ? (
          <View style={s.section}>
            <SectionHeader title="Commercial Terms" />
            <FieldRow label="Total value" value={data.totalValue} />
            <FieldRow label="Deposit" value={data.depositAmount} />
            <FieldRow label="Payment terms" value={data.paymentTerms} />
          </View>
        ) : null}

        {/* Terms and conditions */}
        <View style={s.section}>
          <SectionHeader title="Terms and Conditions" />
          {clauses.map((clause) => (
            <View key={clause.title} style={s.clause}>
              <Text style={s.clauseTitle}>{clause.title}</Text>
              <Text style={s.clauseText}>{clause.text}</Text>
            </View>
          ))}
        </View>

        {/* Additional notes */}
        {data.additionalNotes ? (
          <View style={s.section}>
            <SectionHeader title="Additional Notes" />
            <Text style={s.bodyText}>{data.additionalNotes}</Text>
          </View>
        ) : null}

        {/* Signatures */}
        <View style={s.section} break>
          <SectionHeader title="Signatures" />
          <Text style={{ fontSize: 8.5, color: TEXT_MUTED, marginBottom: 4 }}>
            By signing below, both parties agree to the terms of this agreement.
          </Text>
          <View style={s.signatureRow}>
            <View style={s.signatureBlock}>
              <View style={s.signatureLineEl} />
              <Text style={s.signatureFieldLabel}>SIGNATURE</Text>
              <Text style={s.signatureName}>Inovense</Text>
              <Text style={s.signatureDetail}>hello@inovense.com</Text>
              <Text style={{ ...s.signatureDetail, marginTop: 10 }}>
                Date: ___________________
              </Text>
            </View>
            <View style={s.signatureBlock}>
              <View style={s.signatureLineEl} />
              <Text style={s.signatureFieldLabel}>SIGNATURE</Text>
              <Text style={s.signatureName}>{data.clientName}</Text>
              {data.companyName && data.companyName !== data.clientName && (
                <Text style={s.signatureDetail}>{data.companyName}</Text>
              )}
              <Text style={{ ...s.signatureDetail, marginTop: 10 }}>
                Date: ___________________
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Confidential. Inovense. inovense.com
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
