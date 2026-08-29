import { readFile } from "node:fs/promises";

const url = "https://hcomhdkmtqttzghjxjcb.supabase.co";
const key = "sb_publishable_f4o2ZyRlCQ4h3H186FZ4Mg_FsXRvx9T";

const content = await readFile("package-lock.json", "utf8");
const response = await fetch(`${url}/rest/v1/rpc/_tmp_capture_clean_lock`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    p_token: "1378cb3d0ebd6faaa46474194ae19e15e25a4a083ce3da2325d8c86593ebbb10",
    p_content: content,
  }),
});

if (!response.ok) throw new Error(`Lock capture failed: ${response.status} ${await response.text()}`);
console.log(`Captured clean package-lock.json (${content.length} bytes)`);
