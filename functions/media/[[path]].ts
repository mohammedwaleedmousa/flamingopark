type Env = { PRODUCT_MEDIA: R2Bucket };

const decodeKey = (value: string) => value
  .split("/")
  .map((part) => decodeURIComponent(part))
  .join("/");

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const rawPath = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  const key = decodeKey(rawPath).replace(/^\/+/, "");
  if (!key || key.includes("..")) return new Response("Not found", { status: 404 });

  const object = await env.PRODUCT_MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
};
