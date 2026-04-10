import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ContractDocument } from "@/lib/contract-pdf";
import type { ContractType, ContractData } from "@/lib/contract-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return new NextResponse("Invalid request body", { status: 400 });
  }

  const get = (key: string) => String(body[key] ?? "").trim();

  const contractType = (get("contractType") || "project") as ContractType;

  const data: ContractData = {
    contractType,
    clientName: get("clientName"),
    companyName: get("companyName"),
    clientEmail: get("clientEmail"),
    serviceLane: get("serviceLane"),
    engagementTitle: get("engagementTitle"),
    startDate: get("startDate"),
    scopeSummary: get("scopeSummary"),
    totalValue: get("totalValue"),
    depositAmount: get("depositAmount"),
    paymentTerms: get("paymentTerms") || "7 days from invoice",
    additionalNotes: get("additionalNotes"),
    effectiveDate:
      get("effectiveDate") ||
      new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(
    React.createElement(ContractDocument, { data }) as any
  );

  const slug = data.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || id;
  const filename = `inovense-contract-${slug}.pdf`;

  return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
