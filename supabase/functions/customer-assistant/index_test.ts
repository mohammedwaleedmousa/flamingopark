import { expandSearchTerms, localIntent, redactSensitiveText } from "./index.ts";

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

Deno.test("understands Yemeni product requests and budgets", () => {
  const result = localIntent("اشتي ساعة نسائية تحت 20,000");
  assert(result.intent === "product_search", "expected product_search intent");
  assert(result.maxBudget === 20_000, "expected parsed budget");
  assert(result.language === "ar", "expected Arabic language");
});

Deno.test("understands Egyptian product wording", () => {
  const result = localIntent("عايز شنطة حلوة");
  assert(result.intent === "product_search", "expected product_search intent");
});

Deno.test("recognizes private order questions", () => {
  const result = localIntent("وين طلبي رقم 778123456؟");
  assert(result.intent === "order_status", "expected order_status intent");
});

Deno.test("redacts contact details before model calls", () => {
  const redacted = redactSensitiveText("رقمي 778123456 وبريدي customer@example.com");
  assert(!redacted.includes("778123456"), "phone number was not redacted");
  assert(!redacted.includes("customer@example.com"), "email was not redacted");
});

Deno.test("expands common catalog aliases", () => {
  const terms = expandSearchTerms(["شنطة"]);
  assert(terms.includes("حقيب") && terms.includes("bag"), "bag aliases were not expanded");
});
