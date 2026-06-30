import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InsightsReportDocument } from "@/lib/insights-pdf";
import type { InsightsReportData } from "@/lib/insights-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: Partial<InsightsReportData>;
  try {
    body = await request.json();
  } catch {
    return new NextResponse("Invalid request body", { status: 400 });
  }

  const data: InsightsReportData = {
    workspace: String(body.workspace ?? "Auterim Workspace"),
    periodLabel: String(body.periodLabel ?? "Current period"),
    generatedAt: String(body.generatedAt ?? new Date().toISOString()),
    kpis: Array.isArray(body.kpis) ? body.kpis : [],
    weeklyActions: Array.isArray(body.weeklyActions) ? body.weeklyActions : [],
    weeklyHoursSaved: Array.isArray(body.weeklyHoursSaved) ? body.weeklyHoursSaved : [],
    operators: Array.isArray(body.operators) ? body.operators : [],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(React.createElement(InsightsReportDocument, { data }) as any);
  const slug = data.workspace.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const filename = `auterim-insights-${slug || "workspace"}.pdf`;

  return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
