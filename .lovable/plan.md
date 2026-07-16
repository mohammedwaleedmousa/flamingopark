# خطة: موقع عالمي + نظام 3 عملات

## الملخص
- إزالة الحصر على SA/YE، الموقع يصبح مفتوح عالميًا مع إمكانية تحديد "دول مميزة" من لوحة الأدمن (لها COD ومعاملة خاصة).
- 3 عملات مدعومة: **الريال السعودي (SAR)**، **الريال اليمني الجنوبي (YER-S)**، **الريال اليمني الشمالي (YER-N)**.
- **SAR = العملة الأساسية للتسعير** (كل المنتجات مسعّرة بها في قاعدة البيانات).
- الزائر يبدّل العملة من شريط علوي → يتغير كل شيء في الموقع (البطاقات، السلة، الفاتوره PDF).
- الأدمن يحدّد أسعار الصرف يدويًا + تقارير مالية تُعرض لكل عملة على حدة.

---

## 1. قاعدة البيانات (migration واحد)

### جدول `currencies`
| الحقل | النوع | الغرض |
|---|---|---|
| `code` | text PK | مثل `SAR`, `YER_S`, `YER_N` |
| `name_ar` / `name_en` | text | اسم العرض |
| `symbol` | text | ر.س / ر.ي.ج / ر.ي.ش |
| `rate_to_base` | numeric | كم يساوي 1 SAR بهذه العملة (SAR=1) |
| `is_base` | boolean | العملة الأساسية |
| `is_active` | boolean | إظهار/إخفاء |
| `sort_order` | int | الترتيب |

يتم زرع 3 صفوف افتراضية.

### جدول `countries`
| الحقل | النوع |
|---|---|
| `code` | text PK (ISO مثل `SA`, `YE`, `AE`) |
| `name_ar` / `name_en` | text |
| `flag_emoji` | text |
| `is_featured` | boolean (COD ومعاملة خاصة) |
| `is_active` | boolean |
| `default_currency` | text FK → currencies.code |
| `phone_code` | text (مثل `+966`) |

زرع تلقائي: SA, YE, + قائمة موسّعة (خليج + عربي + عالمي شائع).

### تعديلات على جداول موجودة
- `orders`: إضافة `currency_code`, `exchange_rate_snapshot`, `total_base` (المبلغ محفوظ بـ SAR للتقارير).
- `orders_archive`: نفس الإضافات + تحديث triggerات النسخ.
- `expenses`, `refunds`, `financial_transactions`: إضافة `currency_code` + `amount_base`.
- `cod_regions`: إزالة قيد SA/YE فقط، ربط بـ `country_code`.

كل الجداول الجديدة: GRANT للـ `authenticated` + `service_role`، وقراءة عامة (`anon`) لـ `currencies` و `countries` (بيانات عرض).

---

## 2. الفرونت إند

### Store عالمي (Zustand)
`useCurrencyStore`: يحفظ العملة المختارة في localStorage، مع hook `useCurrency()` يوفر:
- `currency` (الكود الحالي)
- `format(amountInSAR)` → يحوّل ويعرض مع الرمز الصحيح
- `convert(amount, fromCode?, toCode?)`

### شريط التبديل
`CurrencySwitcher` مكوّن صغير في الـ Navbar (بجانب أيقونات الحساب/السلة):
- Dropdown يعرض العملات النشطة (رمز + اسم عربي).
- التبديل فوري بدون reload.

### المكونات المتأثرة
- `ProductCard`, `ProductDetail`, `Cart`, `Checkout`, `Offers`, `BrandPage`: كل مكان يعرض سعر يستخدم `format()` بدل التنسيق اليدوي.
- **فاتورة PDF (`generateInvoicePDF`)**: تستقبل `currency_code` من الطلب، تعرض كل الأسعار بالعملة المحفوظة وقت الطلب مع رمزها.

### إزالة الحصر الجغرافي
- حذف أي كود يفرض SA/YE فقط.
- `PhoneInput`: يستخدم قائمة الدول من `countries`، الفاليديشن يعتمد على `phone_code` بدل كود ثابت.
- COD: يظهر فقط للدول ذات `is_featured = true` وضمن `cod_regions`.
- الدفع الإلكتروني: متاح لكل الدول.

---

## 3. لوحة الأدمن

### صفحة جديدة `/admin/currencies`
- جدول العملات + تعديل `rate_to_base` مباشرة.
- زر "تحديث الأسعار" مع لوغ آخر تحديث.
- تفعيل/تعطيل عملة.

### صفحة جديدة `/admin/countries`
- CRUD كامل للدول.
- تبديل `is_featured` (يفعّل COD والمعاملة الخاصة).
- ربط عملة افتراضية.

### صفحات التقارير المالية
- إضافة **Currency Selector** في أعلى كل صفحة تقرير.
- يمكن للأدمن اختيار: "كل العملات (بـ SAR)" أو عملة محددة.
- الحسابات تستخدم `total_base` للتوحيد، أو `total` + `currency_code` للعرض المفصّل.
- جدول تفصيلي: الإيرادات مقسّمة حسب العملة (SAR / YER-S / YER-N).

---

## 4. الترحيل والبيانات القديمة
- كل الطلبات القديمة تُحدَّث بـ `currency_code = 'SAR'` و `exchange_rate_snapshot = 1` و `total_base = total`.
- لا فقدان بيانات، التقارير تعمل بأثر رجعي.

---

## تفاصيل تقنية

**العملة الأساسية للحسابات:** SAR. كل الحسابات الداخلية (الأرباح، الخصومات على `cost_price`، التقارير المجمّعة) تبقى بـ SAR. التحويل يحدث فقط عند العرض.

**snapshot سعر الصرف في الطلب:** حفظ `exchange_rate_snapshot` وقت الطلب يضمن أن الفاتوره القديمة تظل تعرض نفس المبلغ حتى لو تغيّر السعر لاحقًا.

**الملفات الرئيسية المتأثرة:**
- `src/stores/currencyStore.ts` (جديد)
- `src/hooks/useCurrency.ts` (جديد)
- `src/components/CurrencySwitcher.tsx` (جديد)
- `src/pages/admin/Currencies.tsx` (جديد)
- `src/pages/admin/Countries.tsx` (جديد)
- `src/lib/pdf/generateInvoicePDF.ts` (تعديل)
- `src/components/PhoneInput.tsx` (تعميم)
- كل بطاقات المنتج والسلة والدفع (استبدال `${price} ر.س` بـ `format(price)`)

---

## ترتيب التنفيذ المقترح
1. Migration (الجداول + الأعمدة + الـ seed).
2. Store + Hook + Switcher.
3. تحديث كل نقاط عرض السعر.
4. تعميم PhoneInput وإزالة الحصر.
5. صفحات أدمن (Currencies + Countries).
6. تحديث تقارير المالية.
7. تحديث فاتورة PDF.

هل أبدأ بالتنفيذ بهذا الترتيب؟