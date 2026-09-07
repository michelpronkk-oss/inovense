"use client";

import { openFeedback } from "@/components/dashboard/feedback-dialog";

export function RoadmapFeedbackButton() {
  return <button type="button" className="btn btn-primary" onClick={() => openFeedback("connector_request")}>Request a connector</button>;
}
