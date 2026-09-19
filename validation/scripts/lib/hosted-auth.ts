import type { HostedIdentity } from "./hosted-config.ts";

export type HttpFetch = typeof fetch;

class CookieJar {
  private readonly values = new Map<string, string>();
  capture(headers: Headers): void {
    const headerValues =
      typeof headers.getSetCookie === "function"
        ? headers.getSetCookie()
        : [headers.get("set-cookie") ?? ""];
    for (const header of headerValues) {
      const pair = header.split(";", 1)[0];
      const separator = pair?.indexOf("=") ?? -1;
      if (separator > 0)
        this.values.set(pair!.slice(0, separator), pair!.slice(separator + 1));
    }
  }
  header(): string {
    return [...this.values].map(([key, value]) => `${key}=${value}`).join("; ");
  }
  clear(): void {
    this.values.clear();
  }
}

export type HostedSession = {
  request(path: string, init?: RequestInit): Promise<Response>;
  close(): Promise<void>;
};

export async function loginHostedIdentity(
  appUrl: string,
  identity: HostedIdentity,
  http: HttpFetch = fetch,
): Promise<HostedSession> {
  const cookies = new CookieJar();
  const request = async (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set("Origin", appUrl);
    const cookie = cookies.header();
    if (cookie) headers.set("Cookie", cookie);
    const response = await http(new URL(path, appUrl), {
      ...init,
      headers,
      redirect: "manual",
    });
    cookies.capture(response.headers);
    return response;
  };
  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: identity.email,
      password: identity.password,
    }),
  });
  if (!login.ok) throw new Error(`Hosted login failed (${login.status})`);
  const me = await request("/api/auth/me");
  const body = (await me.json()) as {
    memberships?: Array<{ guild_id: string; role: string }>;
  };
  if (
    !me.ok ||
    body.memberships?.length !== 1 ||
    body.memberships[0]?.guild_id !== identity.guildId ||
    body.memberships[0]?.role !== identity.role
  ) {
    throw new Error(
      "Hosted identity membership did not match the expected fixture",
    );
  }
  return {
    request,
    async close() {
      try {
        await request("/api/auth/logout", { method: "POST" });
      } finally {
        cookies.clear();
      }
    },
  };
}
