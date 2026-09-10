import Link from "next/link";

export function RoadmapFeedbackButton() {
  return <Link href="/feedback?type=connector_request" className="btn btn-primary">Request a connector</Link>;
}
