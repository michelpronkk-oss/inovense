"use client";

import { useReveal } from "./use-reveal";

// Mounts the homepage's fade-and-rise-on-scroll observer for pages whose
// content stays server-rendered (e.g. PublicPricing, kept server-side since
// it's shared plumbing for the /pricing route's metadata export). Renders
// nothing; it only needs to exist somewhere under the page's root class.
export default function RevealMount() {
  useReveal("auterim-v3-page");
  return null;
}
