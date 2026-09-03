/** Central Auterim brand and host configuration. */
export const AUTERIM_NAME = "Auterim";
export const AUTERIM_DOMAIN = "auterim.com";
export const AUTERIM_PUBLIC_HOST = AUTERIM_DOMAIN;
export const AUTERIM_PUBLIC_WWW_HOST = `www.${AUTERIM_DOMAIN}`;
export const AUTERIM_APP_HOST = `app.${AUTERIM_DOMAIN}`;
export const AUTERIM_ADMIN_HOST = `admin.${AUTERIM_DOMAIN}`;
export const AUTERIM_URL = `https://${AUTERIM_DOMAIN}`;
export const AUTERIM_MARKETING_URL = AUTERIM_URL;
export const AUTERIM_APP_URL = `https://${AUTERIM_APP_HOST}`;
export const AUTERIM_ADMIN_URL = `https://${AUTERIM_ADMIN_HOST}`;

export const AUTERIM_EMAILS = {
  hello: "hello@auterim.com",
  support: "support@auterim.com",
  noreply: "noreply@auterim.com",
} as const;

export const AUTERIM_POSITIONING = "Auterim is the AI workforce built around your business.";
export const AUTERIM_DESCRIPTION = "Auterim understands how your company works, recommends AI operators, and runs approved work across the systems your team already uses.";
export const AUTERIM_CORE_LOOP = "Connect → Understand → Diagnose → Recommend → Deploy → Measure → Improve";
export const AUTERIM_ORGANIZATION_ID = `${AUTERIM_URL}/#organization`;
export const AUTERIM_WEBSITE_ID = `${AUTERIM_URL}/#website`;
