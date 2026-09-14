import { permanentRedirect } from "next/navigation";

export default function IntegrationsAliasPage(): never {
  permanentRedirect("/connectors");
}
