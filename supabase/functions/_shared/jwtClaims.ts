// JWT claims are only trusted after the caller validates the token with Supabase Auth.
export function readAalClaim(accessToken: string): "aal1" | "aal2" {
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3 || !parts[1]) return "aal1";
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const claims = JSON.parse(atob(padded)) as { aal?: unknown };
    return claims.aal === "aal2" ? "aal2" : "aal1";
  } catch {
    return "aal1";
  }
}
