type Env = {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
};

type ProductRow = {
  name?: string | null;
  name_ar?: string | null;
  slug?: string | null;
  price?: number | string | null;
  description?: string | null;
  description_ar?: string | null;
  images?: string[] | null;
  color_variants?: Array<{ images?: string[] | null }> | null;
};

const SITE_URL = "https://flamingoparkaden.com";
const FALLBACK_IMAGE = `${SITE_URL}/icons/flamingo.jpeg`;

const getConfig = (env: Env) => {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
};

const firstImage = (product: ProductRow) => {
  const direct = Array.isArray(product.images) ? product.images.find(Boolean) : undefined;
  if (direct) return direct;

  if (Array.isArray(product.color_variants)) {
    for (const variant of product.color_variants) {
      const image = Array.isArray(variant?.images) ? variant.images.find(Boolean) : undefined;
      if (image) return image;
    }
  }

  return FALLBACK_IMAGE;
};

const buildDescription = (product: ProductRow) => {
  const raw = String(product.description_ar || product.description || "").trim();
  const price = Number(product.price);
  const priceText = Number.isFinite(price) && price > 0 ? `السعر: ${price.toLocaleString("en-US")} ر.س` : "";
  const base = raw || `تسوّق ${product.name_ar || product.name || "هذا المنتج"} من Flamingo Park.`;
  return priceText ? `${base} — ${priceText}` : base;
};

const setMeta = (selector: string, content: string) => ({
  element(element: Element) {
    element.setAttribute("content", content);
  },
});

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const slug = String(context.params.slug || "").trim();
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";

  if (!slug || !contentType.includes("text/html")) return response;

  const config = getConfig(context.env);
  if (!config) return response;

  try {
    const endpoint = new URL(`${config.url}/rest/v1/products`);
    endpoint.searchParams.set("select", "name,name_ar,slug,price,description,description_ar,images,color_variants");
    endpoint.searchParams.set("slug", `eq.${slug}`);
    endpoint.searchParams.set("is_active", "eq.true");
    endpoint.searchParams.set("limit", "1");

    const productResponse = await fetch(endpoint, {
      headers: {
        apikey: config.key,
        authorization: `Bearer ${config.key}`,
        accept: "application/json",
      },
    });

    if (!productResponse.ok) return response;

    const rows = await productResponse.json<ProductRow[]>();
    const product = rows[0];
    if (!product) return response;

    const productName = String(product.name_ar || product.name || "منتج من Flamingo Park").trim();
    const title = `${productName} | Flamingo Park`;
    const description = buildDescription(product);
    const image = firstImage(product);
    const productUrl = `${SITE_URL}/product/${encodeURIComponent(product.slug || slug)}`;

    const transformer = new HTMLRewriter()
      .on("title", {
        element(element) {
          element.setInnerContent(title);
        },
      })
      .on('meta[name="description"]', setMeta('meta[name="description"]', description))
      .on('meta[property="og:title"]', setMeta('meta[property="og:title"]', title))
      .on('meta[property="og:description"]', setMeta('meta[property="og:description"]', description))
      .on('meta[property="og:url"]', setMeta('meta[property="og:url"]', productUrl))
      .on('meta[property="og:image"]', setMeta('meta[property="og:image"]', image))
      .on('meta[property="og:type"]', setMeta('meta[property="og:type"]', "product"))
      .on('meta[name="twitter:title"]', setMeta('meta[name="twitter:title"]', title))
      .on('meta[name="twitter:description"]', setMeta('meta[name="twitter:description"]', description))
      .on('meta[name="twitter:url"]', setMeta('meta[name="twitter:url"]', productUrl))
      .on('meta[name="twitter:image"]', setMeta('meta[name="twitter:image"]', image))
      .on('meta[name="twitter:card"]', setMeta('meta[name="twitter:card"]', "summary_large_image"))
      .on('link[rel="canonical"]', {
        element(element) {
          element.setAttribute("href", productUrl);
        },
      });

    const transformed = transformer.transform(response);
    const headers = new Headers(transformed.headers);
    headers.set("cache-control", "public, max-age=60, s-maxage=300, stale-while-revalidate=3600");

    return new Response(transformed.body, {
      status: transformed.status,
      statusText: transformed.statusText,
      headers,
    });
  } catch (error) {
    console.error("[product-og] failed to build product preview", error);
    return response;
  }
};
