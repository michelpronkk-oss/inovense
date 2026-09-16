export type RobotsRule = { userAgents: string[]; allow: boolean; path: string };
export type RobotsPolicy = { rules: RobotsRule[]; sitemaps: string[]; crawlDelayMs: number | null };

function cleanLine(line: string): string {
  return line.replace(/^\uFEFF/, "").split("#", 1)[0].trim();
}

/** RFC 9309-compatible enough for the fetch paths used by Auterim: matching
 * user-agent groups are combined, the most specific path wins, and Allow wins
 * a same-length tie. */
export function parseRobotsTxt(input: string): RobotsPolicy {
  const groups: Array<{ userAgents: string[]; rules: RobotsRule[]; crawlDelayMs: number | null }> = [];
  let current: { userAgents: string[]; rules: RobotsRule[]; crawlDelayMs: number | null } | null = null;
  const sitemaps: string[] = [];
  for (const rawLine of input.split(/\r?\n/).slice(0, 10_000)) {
    const line = cleanLine(rawLine);
    if (!line) { current = null; continue; }
    if (!line.includes(":")) continue;
    const separator = line.indexOf(":");
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "sitemap") { if (value) sitemaps.push(value); continue; }
    if (field === "user-agent") {
      if (!current) {
        current = { userAgents: [], rules: [], crawlDelayMs: null };
        groups.push(current);
      }
      if (value && current.userAgents.length < 10) current.userAgents.push(value.toLowerCase());
      continue;
    }
    if (!current || !current.userAgents.length) continue;
    if (field === "allow" || field === "disallow") {
      if (value || field === "allow") current.rules.push({ userAgents: current.userAgents, allow: field === "allow", path: value.slice(0, 2_048) });
    } else if (field === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0 && seconds <= 60) current.crawlDelayMs = Math.floor(seconds * 1_000);
    }
  }
  return {
    rules: groups.flatMap((group) => group.rules).slice(0, 500),
    sitemaps: Array.from(new Set(sitemaps)).slice(0, 10),
    crawlDelayMs: groups.map((group) => group.crawlDelayMs).find((value): value is number => value !== null) ?? null,
  };
}

function matchingRules(policy: RobotsPolicy, userAgent: string): RobotsRule[] {
  const normalized = userAgent.toLowerCase();
  const exact = policy.rules.filter((rule) => rule.userAgents.some((agent) => agent !== "*" && normalized.includes(agent)));
  if (exact.length) return exact;
  return policy.rules.filter((rule) => rule.userAgents.includes("*"));
}

function ruleMatches(pathname: string, rule: string): boolean {
  if (!rule) return false;
  const endAnchored = rule.endsWith("$");
  const raw = endAnchored ? rule.slice(0, -1) : rule;
  const escaped = raw.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}${endAnchored ? "$" : ""}`).test(pathname);
}

export function isWebsitePathAllowed(policy: RobotsPolicy, pathname: string, userAgent = "AuterimBot"): boolean {
  const rules = matchingRules(policy, userAgent).filter((rule) => rule.path.length > 0 && ruleMatches(pathname, rule.path));
  if (!rules.length) return true;
  const strongest = rules.reduce((winner, rule) => rule.path.length > winner.path.length || (rule.path.length === winner.path.length && rule.allow) ? rule : winner);
  return strongest.allow;
}

export function serializeRobotsRules(policy: RobotsPolicy): RobotsRule[] {
  return policy.rules.map((rule) => ({ userAgents: rule.userAgents.slice(0, 10), allow: rule.allow, path: rule.path.slice(0, 512) })).slice(0, 300);
}
