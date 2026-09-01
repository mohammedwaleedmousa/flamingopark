const RELEASE_ID = "2026-09-01-checkout-cod-1";

export const onRequestGet: PagesFunction = async () => {
  return Response.json(
    {
      ok: true,
      release: RELEASE_ID,
      service: "flamingopark",
      build_verified_by: "cloudflare-pages",
    },
    {
      status: 200,
      headers: {
        "cache-control": "no-store",
      },
    },
  );
};
