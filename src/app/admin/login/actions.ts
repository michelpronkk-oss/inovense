"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getValidCredentials,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
} from "@/lib/session";

export async function login(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  if (!process.env.SESSION_SECRET) {
    return {
      error:
        "Auth is not configured. Set SESSION_SECRET in your environment variables.",
    };
  }

  const username = ((formData.get("username") as string) ?? "").trim();
  const password = (formData.get("password") as string) ?? "";
  const from = (formData.get("from") as string) ?? "/admin";

  const credentials = getValidCredentials();
  if (credentials.length === 0) {
    return {
      error:
        "No admin credentials are configured. Set ADMIN_USERS in your environment variables.",
    };
  }

  const valid = credentials.some(
    (c) => c.user === username && c.pass === password
  );

  if (!valid) {
    // Brief delay to slow brute-force attempts
    await new Promise((r) => setTimeout(r, 400));
    return { error: "Invalid username or password." };
  }

  const token = await createSessionToken(username);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SEC,
    path: "/",
  });

  const safeDest =
    from.startsWith("/admin") && from !== "/admin/login" ? from : "/admin";

  redirect(safeDest);
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/admin/login");
}
