# خطة التحسينات الشاملة (9 نقاط)

سأنفّذها على دفعة واحدة، مرتّبة من الأهم للأقل. كل التغييرات Frontend فقط (لا تعديل على قاعدة البيانات أو الأدمن الحالي).

---

## 1. إصلاح الخط على iPhone (الأهم — يحل المظهر المتقطع)
- إضافة `font-display: swap` لخطوط Google.
- زيادة `font-weight` الافتراضي للعربي على iOS (Safari يعرض الرفيع متقطّعاً).
- استخدام `'SF Arabic', 'Geeza Pro'` كأولوية أولى للنصوص العربية بدلاً من Inter.
- إضافة `-webkit-font-smoothing: subpixel-antialiased` للعربية تحديداً.
- ضبط `line-height: 1.8` للفقرات العربية.

## 2. Sidebar — Redesign فاخر
- خلفية متدرّجة سوداء عميقة + Pattern خفيف.
- صورة بروفايل دائرية أكبر + Badge نقاط/مستوى العميل.
- تجميع أنيق: Quick Actions (سلة/مفضلة/عروض) ببطاقات أكبر مع أرقام بارزة.
- الأقسام بـ Collapsible مع animation أنعم + أيقونات ملوّنة دائرية.
- Footer به: تبديل اللغة، الدولة (SA/YE)، روابط سوشيال.
- Scroll smooth + sticky header داخل الـ Sheet.

## 3. ProductCard — عصري + أنميشن
- إضافة **Quick View** (يفتح Modal).
- Badge "تخفيض" بأنميشن نبض.
- نجوم تقييم تحت السعر.
- Hover: Slide-up شريط (إضافة + قلب + نظرة) بدلاً من زر واحد.
- Skeleton مع shimmer متحرّك (موجة ضوء).
- Fade-in تدريجي عند التحميل (stagger).

## 4. Loading عكسي + Double Skeleton
- LoadingScreen: الحروف تظهر من اليمين لليسار (عكس) لتطابق RTL.
- ProductCardSkeleton: عرض شبكة من 8 بطاقات بـ shimmer متموّج.
- إضافة "skeleton wave" — موجة ضوئية تمرّ بشكل متتالي على البطاقات.
- بين الصفحات: top-bar progress + fade-out للصفحة القديمة + fade-in للجديدة.

## 5. ProductDetailPage — معلومات أكثر
- Tabs: الوصف / المواصفات / الشحن والإرجاع / التقييمات.
- شارة "مخزون منخفض" إذا قلّ.
- عدّاد "X شخص يشاهد هذا الآن" (وهمي محلي).
- معلومات الشحن (مدة + تكلفة تقديرية) أعلى زر الشراء.
- "تم بيع X قطعة هذا الأسبوع" (محلي).
- مشاركة لـ WhatsApp/Twitter/Copy.
- Sticky bottom CTA على الموبايل مع السعر.

## 6. CheckoutPage — تجربة محسّنة
- **Stepper علوي**: المعلومات → التوصيل → الدفع → التأكيد (مع progress).
- ملخّص الطلب Sticky على الديسكتوب، Drawer سفلي على الموبايل.
- بطاقات اختيار الدفع/التوصيل أكبر مع أيقونات وأنميشن tick.
- "Trust badges": دفع آمن، إرجاع، توصيل سريع.
- Animated success state بعد الإرسال.

## 7. ترتيب الأقسام بأسلوب SHEIN
ترتيب جديد لـ HomePage:
```
1. Hero Slider
2. شريط Categories أيقونية دائرية أفقي (Scroll)  ← جديد
3. Flash Sale / عروض اليوم (بعدّاد زمني)  ← جديد
4. الأكثر مبيعاً
5. Featured Categories (Editorial كبير)
6. وصل حديثاً
7. Banner كامل
8. تصنيفات شائعة (شبكة 6)  ← جديد
9. جميع المنتجات
10. شريط ثقة (شحن/دفع/إرجاع)  ← جديد
```

## 8. أنميشن عام للمتجر
- Stagger fade-in للأقسام عند التمرير (IntersectionObserver).
- Hover effects على كل البطاقات (scale خفيف + shadow).
- Page transitions بـ fade.
- زر "العودة للأعلى" مع animation.
- Marquee شريط إعلاني علوي رفيع متحرّك.

## 9. ربط الأدمن (لا تعديل على Backend)
- التأكد أن كل صفحة Frontend تقرأ من Supabase (categories, products, banners, offers, site_content).
- إضافة شريط إعلان علوي يقرأ من `site_settings` → key `announcement_bar`.
- التأكد من قراءة WhatsApp/Banks/COD من DB.
- **عدم لمس** بيانات المنتجات الحالية.

---

## ملفات ستُعدّل/تُنشأ
**جديدة:**
- `src/components/FlashSaleSection.tsx`
- `src/components/CategoryIconsRow.tsx`
- `src/components/TrustBar.tsx`
- `src/components/AnnouncementBar.tsx`
- `src/components/QuickViewModal.tsx`
- `src/components/BackToTop.tsx`
- `src/components/CheckoutStepper.tsx`
- `src/hooks/useInView.ts`

**ستُعدَّل:**
- `src/index.css` (خطوط + animations)
- `src/components/Navbar.tsx` (Sidebar)
- `src/components/ProductCard.tsx`
- `src/components/ProductCardSkeleton.tsx`
- `src/components/LoadingScreen.tsx`
- `src/pages/HomePage.tsx` (الترتيب الجديد)
- `src/pages/ProductDetailPage.tsx` (Tabs + Sticky CTA)
- `src/pages/CheckoutPage.tsx` (Stepper)
- `src/App.tsx` (BackToTop + AnnouncementBar)

---

## ما لن أفعله
- لا تغيير على schema قاعدة البيانات.
- لا حذف منتجات أو بيانات.
- لا تعديل على صفحات الأدمن.
- لا تغيير منطق الفواتير/العمولات/الكوبونات.

هل أبدأ التنفيذ؟