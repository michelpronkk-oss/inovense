const trimSlash = (value: string): string => value.replace(/\/+$/, "");

function join(base: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimSlash(base)}${normalizedPath}`;
}

export function appHref(path: string = "/app"): string {
  const appBase = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appBase) return path;
  return join(appBase, path);
}

export function marketingHref(path: string = "/"): string {
  const marketingBase = process.env.NEXT_PUBLIC_MARKETING_URL?.trim();
  if (!marketingBase) return path;
  return join(marketingBase, path);
}

