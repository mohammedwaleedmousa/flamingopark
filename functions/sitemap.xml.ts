type Env = {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
};

type SitemapRow = {
  slug?: string | null;
  updated_at?: string | null;
};

const SITE_URL = "https://flamingoparkaden.com";

const STATIC_PATHS = [
  "/",
  "/home",
  "/products",
  "/categories",
  "/brands",
  "/new-arrivals",
  "/best-sellers",
  "/seasonal-offers",
  "/reviews",
  "/store-info",
];

const xmlEscape = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&apos;");

const getConfig = (env: Env) => {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
};

const fetchRows = async (config: { url: string; key: string }, table: string) => {
  const url = new URL(`${config.url}/rest/v1/${table}`);
  url.searchParams.set("select", "slug,updated_at");
  url.searchParams.set("is_active", "eq.true");
  url.searchParams.set("slug", "not.is.null");
  url.searchParams.set("limit", "1000");

  const response = await fetch(url, {
    headers: {
      apikey: config.key,
      authorization: `Bearer ${config.key}`,
      accept: "application/json",
    },
  });

  if (!response.ok) throw new Error(`${table} sitemap query failed: ${response.status}`);
  return response.json<Array<SitemapRow>>();
};

const entry = (path: string, updatedAt?: string | null, priority = "0.7", changefreq = "weekly") => {
  const lastmod = updatedAt ? `\n    <lastmod>${xmlEscape(updatedAt.slice(0, 10))}</lastmod>` : "";
  return `  <url>\n    <loc>${xmlEscape(`${SITE_URL}${path}`)}</loc>${lastmod}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
};

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const entries = STATIC_PATHS.map((path) => entry(path, null, path === "/" || path === "/home" ? "1.0" : "0.8", path === "/store-info" ? "monthly" : "daily"));
  const config = getConfig(env);

  if (config) {
    try {
      const [products, brands, categories] = await Promise.all([
        fetchRows(config, "products"),
        fetchRows(config, "brands"),
        fetchRows(config, "categories"),
      ]);

      for (const row of products) {
        if (row.slug) entries.push(entry(`/product/${encodeURIComponent(row.slug)}`, row.updated_at, "0.8", "weekly"));
      }

      for (const row of brands) {
        if (row.slug) entries.push(entry(`/brands/${encodeURIComponent(row.slug)}`, row.updated_at, "0.7", "weekly"));
      }

      for (const row of categories) {
        if (row.slug) entries.push(entry(`/products?category=${encodeURIComponent(row.slug)}`, row.updated_at, "0.6", "weekly"));
      }
    } catch (error) {
      console.error("[sitemap] dynamic entries unavailable", error);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};
