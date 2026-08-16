import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const cartDrawerSource = readSource("../src/components/CartDrawerContent.tsx");
const cartPageSource = readSource("../src/pages/CartPage.tsx");
const minimalCardSource = readSource("../src/components/ProductCardMinimal.tsx");
const productDetailSource = readSource("../src/pages/ProductDetailPage.tsx");
const searchPageSource = readSource("../src/pages/SearchPage.tsx");
const storeSource = readSource("../src/store/useStore.ts");
const analyticsSource = readSource("../src/lib/analytics.ts");
const reviewsSource = readSource("../src/components/ProductReviews.tsx");
const customerAuthSource = readSource("../src/lib/customerAuth.ts");
const customerAuthPageSource = readSource("../src/pages/CustomerAuthPage.tsx");
const internationalPhoneSource = readSource("../src/lib/internationalPhone.ts");
const countriesSource = readSource("../src/lib/countries.ts");
const checkoutSource = readSource("../src/pages/CheckoutPage.tsx");
const myOrdersSource = readSource("../src/pages/MyOrdersPage.tsx");
const orderTrackingSource = readSource("../src/pages/OrderTrackingPage.tsx");
const createOrderFunctionSource = readSource("../supabase/functions/create-order/index.ts");
const invoiceAccessFunctionSource = readSource("../supabase/functions/invoice-access/index.ts");
const customerAuthFunctionSource = readSource("../supabase/functions/customer-auth-bootstrap/index.ts");
const customerRegistrationFinalizeSource = readSource("../supabase/functions/customer-registration-finalize/index.ts");
const migrationSource = readSource("../supabase/migrations/20260816090723_p0_customer_phone_auth_orders_security.sql");
const configSource = readSource("../supabase/config.toml");

test("customer cart and product cards use the shared currency formatter", () => {
  for (const source of [cartDrawerSource, cartPageSource, minimalCardSource]) {
    assert.doesNotMatch(source, /const\s+currency\s*=\s*["']ر\.ي["']/);
    assert.match(source, /useCurrency\(\)/);
  }
});

test("storefront product payloads cannot include acquisition cost", () => {
  assert.doesNotMatch(productDetailSource, /cost_price/);
  assert.doesNotMatch(searchPageSource, /cost_price|costPrice/);
  assert.doesNotMatch(storeSource, /costPrice/);
  assert.match(migrationSource, /REVOKE SELECT \(cost_price\) ON public\.products/);
  assert.match(migrationSource, /get_admin_product_costs/);
});

test("checkout uses the Edge order service and keeps the RPC contract server-side", () => {
  assert.match(checkoutSource, /functions\.invoke\("create-order"/);
  assert.doesNotMatch(checkoutSource, /\.rpc\("create_secure_order"/);
  assert.doesNotMatch(checkoutSource, /p_subtotal|p_delivery_fee|p_total|p_total_base|p_discount_amount|p_exchange_rate_snapshot/);
  assert.match(createOrderFunctionSource, /service\.rpc\("quote_secure_order"/);
  assert.match(createOrderFunctionSource, /service\.rpc\("create_secure_order"/);
  for (const parameter of ["p_owner_user_id", "p_customer_id", "p_customer_name", "p_customer_phone", "p_customer_address", "p_customer_city", "p_customer_region", "p_customer_notes", "p_payment_method", "p_delivery_company_id", "p_coupon_code", "p_currency_mode", "p_items"]) {
    assert.match(createOrderFunctionSource, new RegExp(`${parameter}:`));
    assert.match(migrationSource, new RegExp(parameter));
  }
  assert.match(configSource, /\[functions\.create-order\][\s\S]*?verify_jwt\s*=\s*false/);
});

test("my orders uses authenticated ownership instead of phone or browser tracking tokens", () => {
  assert.match(myOrdersSource, /loadCustomerSession\(\)/);
  assert.match(myOrdersSource, /\.eq\("owner_user_id", ownerUserId\)/);
  assert.doesNotMatch(myOrdersSource, /customer_phone\.eq|\.eq\("customer_id"|tracking_token/);
  assert.match(orderTrackingSource, /rpc\("get_order_tracking"/);
  assert.match(orderTrackingSource, /enabled:\s*Boolean\(selectedOrder\)/);
  assert.match(orderTrackingSource, /p_tracking_token:\s*trackingToken/);
  assert.match(invoiceAccessFunctionSource, /order\.owner_user_id === user\.id/);
  assert.match(invoiceAccessFunctionSource, /if \(!isAdmin && !isOwner && !validTrackingToken\)/);
  assert.match(migrationSource, /CREATE POLICY "Order owners read own orders"[\s\S]*?owner_user_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(migrationSource, /o\.owner_user_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(migrationSource, /tracking_token_hash = encode\(digest\(p_tracking_token, 'sha256'\), 'hex'\)/);
});

test("analytics and customer reviews use rate-limited Edge Functions", () => {
  assert.match(analyticsSource, /functions\.invoke\("analytics-event"/);
  assert.doesNotMatch(analyticsSource, /from\("analytics_events"\)\.insert/);
  assert.match(reviewsSource, /functions\.invoke\("submit-review"/);
  assert.doesNotMatch(reviewsSource, /from\("product_reviews"\)\.insert/);
  assert.match(migrationSource, /consume_public_submission_rate_limit/);
  assert.match(migrationSource, /REVOKE INSERT ON public\.analytics_events/);
  assert.match(migrationSource, /DROP POLICY IF EXISTS "Anyone can create product reviews"/);
});

test("new customer signup is global and uses password auth without paid OTP", () => {
  const passwordInput = customerAuthPageSource.match(/<input id="auth-password"[^>]+>/)?.[0] || "";

  assert.match(internationalPhoneSource, /\^\\\+\[1-9\]\\d\{7,14\}\$/);
  assert.match(countriesSource, /AD AE AF/);
  assert.match(countriesSource, /SA/);
  assert.match(countriesSource, /US/);
  assert.match(countriesSource, /YE/);

  assert.match(customerAuthSource, /auth\.signUp\(\{/);
  assert.match(customerAuthSource, /phone:\s*registration\.phone/);
  assert.match(customerAuthSource, /password:\s*registration\.password/);
  assert.match(customerAuthSource, /verification_channel:\s*"none"/);
  assert.match(customerAuthSource, /functions\.invoke\("customer-registration-finalize"/);
  assert.match(customerAuthSource, /channel:\s*"none"/);
  assert.doesNotMatch(customerAuthSource, /signInWithOtp|verifyOtp|resendCustomerRegistrationOtp/);
  assert.doesNotMatch(customerAuthSource, /phone_confirm:\s*true/);

  assert.match(customerAuthPageSource, /COUNTRIES\.map/);
  assert.match(customerAuthPageSource, /country:\s*"YE"/);
  assert.match(customerAuthPageSource, /"إنشاء الحساب"/);
  assert.doesNotMatch(customerAuthPageSource, /one-time-code|إرسال رمز التحقق|إعادة الإرسال|VerificationChannel/);
  assert.doesNotMatch(customerAuthPageSource, /toYemenLocalPhone|\+967\$\{formData\.phone\}/);
  assert.match(passwordInput, /minLength=\{6\}/);

  assert.match(customerRegistrationFinalizeSource, /"none" \| "sms" \| "whatsapp" \| "email"/);
  assert.match(customerRegistrationFinalizeSource, /channel === "email"/);
  assert.match(customerRegistrationFinalizeSource, /channel === "sms" \|\| channel === "whatsapp"/);
  assert.match(customerRegistrationFinalizeSource, /normalizePhone\(user\.phone\) !== phone/);
  assert.match(customerRegistrationFinalizeSource, /from\("customers"\)\.insert/);
  assert.match(customerRegistrationFinalizeSource, /existingByPhone/);
  assert.match(customerRegistrationFinalizeSource, /\^\\\+\[1-9\]\\d\{7,14\}\$/);

  assert.match(configSource, /enable_signup\s*=\s*true/);
  assert.match(configSource, /\[functions\.customer-registration-finalize\][\s\S]*?verify_jwt\s*=\s*true/);
});

test("legacy customer passwords stay on the isolated Yemen-only migration bridge", () => {
  assert.match(customerAuthSource, /normalizeYemenPhone/);
  assert.match(customerAuthSource, /functions\.invoke\("customer-auth-bootstrap"/);
  assert.match(customerAuthFunctionSource, /service\.auth\.admin\.createUser/);
  assert.match(customerAuthFunctionSource, /p_mode:\s*"migrate"/);
  assert.match(customerAuthFunctionSource, /body\.mode !== "migrate"/);
  assert.doesNotMatch(customerAuthFunctionSource, /mode === "register"/);
  assert.match(migrationSource, /char_length\(p_password\) < 6/);
  assert.doesNotMatch(migrationSource, /weak_pin|p_pin/);
});
