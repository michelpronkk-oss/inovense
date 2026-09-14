import { permanentRedirect } from "next/navigation";

// Consolidate the older, incomplete public AI agents page on the canonical
// Operators page. The authenticated app has its own /app/agents route.
export default function AgentsAliasPage(): never {
  permanentRedirect("/operators");
}
