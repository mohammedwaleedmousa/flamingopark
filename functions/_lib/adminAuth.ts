type Env = {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
};

const getSupabaseConfig = (env: Env) => {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  if (!url || !key) throw new Error("Supabase runtime variables are not configured");
  return { url: url.replace(/\/$/, ""), key };
};

export async function requireAdmin(request: Request, env: Env) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  if (!token) return { ok: false as const, status: 401, message: "Authentication required" };

  let config: { url: string; key: string };
  try {
    config = getSupabaseConfig(env);
  } catch (error) {
    console.error("[media-auth] missing runtime config", error);
    return { ok: false as const, status: 500, message: "Server authentication is not configured" };
  }

  const userResponse = await fetch(`${config.url}/auth/v1/user`, {
    headers: { authorization: `Bearer ${token}`, apikey: config.key },
  });
  if (!userResponse.ok) return { ok: false as const, status: 401, message: "Invalid session" };

  const user = await userResponse.json<{ id?: string }>();
  if (!user?.id) return { ok: false as const, status: 401, message: "Invalid session" };

  const roleUrl = new URL(`${config.url}/rest/v1/user_roles`);
  roleUrl.searchParams.set("select", "role");
  roleUrl.searchParams.set("user_id", `eq.${user.id}`);
  roleUrl.searchParams.set("role", "eq.admin");
  roleUrl.searchParams.set("limit", "1");

  const roleResponse = await fetch(roleUrl, {
    headers: {
      authorization: `Bearer ${token}`,
      apikey: config.key,
      accept: "application/json",
    },
  });
  if (!roleResponse.ok) return { ok: false as const, status: 403, message: "Admin access required" };

  const roles = await roleResponse.json<Array<{ role?: string }>>();
  if (!roles.some((row) => row.role === "admin")) {
    return { ok: false as const, status: 403, message: "Admin access required" };
  }

  return { ok: true as const, userId: user.id };
}
