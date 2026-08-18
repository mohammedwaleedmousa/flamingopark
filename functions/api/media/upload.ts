import { requireAdmin } from "../../_lib/adminAuth";

type Env = {
  PRODUCT_MEDIA: R2Bucket;
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
};

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);

const safePrefix = (value: string | null) => {
  const cleaned = (value || "products")
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/\.{2,}/g, "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/")
    .slice(0, 120);
  return cleaned || "products";
};

const extensionFor = (type: string) => {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  return "webp";
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  if (!env.PRODUCT_MEDIA) {
    return Response.json({ error: "R2 binding PRODUCT_MEDIA is not configured" }, { status: 500 });
  }

  const contentType = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) {
    return Response.json({ error: "Unsupported image type" }, { status: 415 });
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BYTES) {
    return Response.json({ error: "Image is too large" }, { status: 413 });
  }

  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) {
    return Response.json({ error: "Image is empty or too large" }, { status: bytes.byteLength ? 413 : 400 });
  }

  const prefix = safePrefix(request.headers.get("x-upload-prefix"));
  const key = `${prefix}/${crypto.randomUUID()}.${extensionFor(contentType)}`;

  await env.PRODUCT_MEDIA.put(key, bytes, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: {
      uploadedBy: auth.userId,
      source: "flamingopark-admin",
    },
  });

  const url = new URL(request.url);
  const publicUrl = `${url.origin}/media/${key.split("/").map(encodeURIComponent).join("/")}`;
  return Response.json({ ok: true, key, url: publicUrl }, { status: 201 });
};
