import { supabase } from "@/integrations/supabase/client";
import { listEntityRevisions, type AdminRevision } from "@/lib/adminProductivity";

export type ProductAudience = "men" | "women" | "kids" | "unisex";

export type ClassificationSuggestion = {
  value: string;
  label: string;
  confidence: number;
  reasons: string[];
};

export type ProductClassificationRow = {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  brand_id: string | null;
  brand: string | null;
  category_id: string | null;
  category: string | null;
  audience: string | null;
  brandSuggestion: ClassificationSuggestion | null;
  categorySuggestion: ClassificationSuggestion | null;
  audienceSuggestion: ClassificationSuggestion | null;
};

type Brand = { id: string; name: string; slug: string };
type Category = { id: string; name: string; name_ar: string; slug: string; parent_id: string | null };
type Product = {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  brand_id: string | null;
  brand: string | null;
  category_id: string | null;
  category: string | null;
  audience: string | null;
};

const normalize = (value: string | null | undefined) =>
  String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .trim();

const tokens = (value: string) => normalize(value).split(/\s+/).filter((token) => token.length > 1);
const includesToken = (text: string, token: string) => ` ${text} `.includes(` ${token} `);
const includesPhrase = (text: string, phrase: string) => ` ${text} `.includes(` ${normalize(phrase)} `);

const BRAND_ALIASES: Record<string, string[]> = {
  lv: ["lv", "louis vuitton", "لويس فيتون", "لويس فيتن"],
  dg: ["dg", "d g", "dolce gabbana", "دولتشي", "دولشي"],
  chc: ["chc", "carolina herrera", "كارولينا هيريرا"],
  "saint-laurent": ["saint laurent", "ysl", "سان لوران"],
  "michael-kors": ["michael kors", "mk", "مايكل كورس"],
  "new-balance": ["new balance", "نيو بالانس"],
  "van-cleef-arpels": ["van cleef", "vca", "فان كليف"],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  bags: ["bag", "bags", "handbag", "شنطه", "شنطة", "حقيبه", "حقيبة"],
  handbags: ["handbag", "top handle", "حقيبه يد", "حقيبة يد", "شنطه يد", "شنطة يد"],
  shoulderhandbag: ["shoulder", "كتف"],
  crossbody: ["crossbody", "cross body", "كروس"],
  belts: ["belt", "belts", "حزام", "احزمه", "أحزمة"],
  glasses: ["glasses", "sunglasses", "eyewear", "نظاره", "نظارة", "نظارات"],
  bracelets: ["bracelet", "bracelets", "bangle", "اسوره", "أسورة", "اساور", "أساور"],
  rings: ["ring", "rings", "خاتم", "خواتم"],
  necklaces: ["necklace", "necklaces", "chain", "سلسال", "قلاده", "قلادة", "قلادات"],
  earring: ["earring", "earrings", "حلق", "اقراط", "أقراط"],
  watchs: ["watch", "watches", "ساعه", "ساعة", "ساعات"],
  "mens-watches": ["mens watch", "men watch", "male watch", "ساعه رجالي", "ساعة رجالية", "ساعات رجالية"],
  "other-watches": ["womens watch", "women watch", "female watch", "ساعه نسائي", "ساعة نسائية", "ساعات نسائية"],
  "mens-shoes": ["mens shoes", "men shoes", "male shoes", "حذاء رجالي", "احذيه رجالي", "أحذية رجالية"],
  sports: ["sneaker", "sneakers", "sport", "sports", "رياضي", "سبورت"],
  sandals: ["sandal", "sandals", "صندل"],
  boot: ["boot", "boots", "بوت"],
  high: ["heel", "heels", "كعب"],
  flat: ["flat", "flats", "فلات"],
  dresses: ["dress", "dresses", "فستان", "فساتين"],
  "womens-sets": ["womens set", "women set", "طقم نسائي", "اطقم نسائي", "أطقم نسائية"],
  "mens-pants": ["mens pants", "men pants", "بنطلون رجالي", "بناطيل رجالية"],
  "kids-clothing": ["kids clothing", "child clothing", "ملابس اطفال", "ملابس أطفال"],
  "kids-dresses": ["kids dress", "فستان اطفال", "فساتين اطفال", "فساتين أطفال"],
  cap: ["cap", "hat", "كاب", "قبعه", "قبعة"],
};

const audienceFromText = (text: string): ClassificationSuggestion | null => {
  const normalized = normalize(text);
  const groups: Array<{ value: ProductAudience; label: string; terms: string[] }> = [
    { value: "kids", label: "أطفال", terms: ["kids", "kid", "children", "child", "baby", "babies", "اطفال", "أطفال", "طفل", "ولادي", "بناتي"] },
    { value: "women", label: "نسائي", terms: ["women", "womens", "female", "lady", "ladies", "نسائي", "نسائيه", "نسائية", "حريمي"] },
    { value: "men", label: "رجالي", terms: ["men", "mens", "male", "man", "رجالي", "رجاليه", "رجالية", "رجال"] },
    { value: "unisex", label: "للجميع", terms: ["unisex", "للجميع"] },
  ];
  for (const group of groups) {
    const hit = group.terms.find((term) => {
      const termTokens = tokens(term);
      return termTokens.length === 1 ? includesToken(normalized, termTokens[0]) : includesPhrase(normalized, term);
    });
    if (hit) return { value: group.value, label: group.label, confidence: 0.94, reasons: [`الكلمة «${hit}» موجودة في بيانات المنتج`] };
  }
  return null;
};

const brandSuggestion = (product: Product, brands: Brand[]): ClassificationSuggestion | null => {
  const text = normalize(`${product.name} ${product.name_ar} ${product.slug}`);
  let best: ClassificationSuggestion | null = null;
  for (const brand of brands) {
    const aliases = [brand.name, brand.slug, ...(BRAND_ALIASES[brand.slug] || [])].map(normalize).filter(Boolean);
    for (const alias of aliases) {
      const aliasTokens = tokens(alias);
      const exactPhrase = aliasTokens.length > 1 ? includesPhrase(text, alias) : aliasTokens.length === 1 && includesToken(text, aliasTokens[0]);
      const tokenMatch = aliasTokens.length > 0 && aliasTokens.every((token) => includesToken(text, token));
      if (!exactPhrase && !tokenMatch) continue;
      const confidence = alias.length <= 2 ? 0.88 : exactPhrase ? 0.98 : 0.93;
      if (!best || confidence > best.confidence) {
        best = { value: brand.id, label: brand.name, confidence, reasons: [`تطابق اسم/اختصار الماركة «${alias}» مع اسم المنتج`] };
      }
    }
  }
  return best;
};

const categorySuggestion = (product: Product, categories: Category[], products: Product[]): ClassificationSuggestion | null => {
  const text = normalize(`${product.name} ${product.name_ar} ${product.slug}`);
  let best: ClassificationSuggestion | null = null;

  for (const category of categories) {
    const terms = [category.name, category.name_ar, category.slug, ...(CATEGORY_KEYWORDS[category.slug] || [])]
      .map(normalize)
      .filter((term) => term.length > 2);
    const hit = terms.find((term) => {
      const termTokens = tokens(term);
      return termTokens.length === 1 ? includesToken(text, termTokens[0]) : includesPhrase(text, term);
    });
    if (!hit) continue;
    const confidence = CATEGORY_KEYWORDS[category.slug]?.some((term) => normalize(term) === hit) ? 0.94 : 0.88;
    if (!best || confidence > best.confidence) {
      best = { value: category.id, label: category.name_ar || category.name, confidence, reasons: [`تطابق «${hit}» مع القسم`] };
    }
  }

  if (best) return best;

  const peerTokens = tokens(`${product.name} ${product.name_ar}`).filter((token) => token.length >= 4).slice(0, 8);
  const counts = new Map<string, number>();
  for (const peer of products) {
    if (!peer.category_id || peer.id === product.id) continue;
    const peerText = normalize(`${peer.name} ${peer.name_ar}`);
    const matches = peerTokens.filter((token) => includesToken(peerText, token)).length;
    if (matches >= 2) counts.set(peer.category_id, (counts.get(peer.category_id) || 0) + matches);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 4) {
    const category = categories.find((item) => item.id === top[0]);
    if (category) return { value: category.id, label: category.name_ar || category.name, confidence: 0.72, reasons: ["منتجات مشابهة بالاسم مصنفة في هذا القسم"] };
  }

  return null;
};

export const loadProductClassificationSuggestions = async (): Promise<ProductClassificationRow[]> => {
  const [{ data: productsData, error: productsError }, { data: brandsData, error: brandsError }, { data: categoriesData, error: categoriesError }] = await Promise.all([
    (supabase as any).from("products").select("id,name,name_ar,slug,brand_id,brand,category_id,category,audience").order("updated_at", { ascending: false }),
    (supabase as any).from("brands").select("id,name,slug").eq("is_active", true).order("sort_order"),
    (supabase as any).from("categories").select("id,name,name_ar,slug,parent_id").eq("is_active", true).order("sort_order"),
  ]);
  if (productsError) throw productsError;
  if (brandsError) throw brandsError;
  if (categoriesError) throw categoriesError;

  const products = (productsData ?? []) as Product[];
  const brands = (brandsData ?? []) as Brand[];
  const categories = (categoriesData ?? []) as Category[];

  return products
    .filter((product) => !product.brand_id || !product.category_id || !product.audience)
    .map((product) => ({
      ...product,
      brandSuggestion: product.brand_id ? null : brandSuggestion(product, brands),
      categorySuggestion: product.category_id ? null : categorySuggestion(product, categories, products),
      audienceSuggestion: product.audience ? null : audienceFromText(`${product.name} ${product.name_ar} ${product.slug} ${product.category || ""}`),
    }));
};

export const applyProductClassification = async (productId: string, patch: { brand_id?: string; category_id?: string; audience?: ProductAudience }) => {
  const { data, error } = await (supabase as any).rpc("admin_apply_product_classification", { p_product_id: productId, p_patch: patch });
  if (error) throw error;
  return data;
};

export const undoProductRevision = async (revisionId: string) => {
  const { data, error } = await (supabase as any).rpc("admin_undo_product_revision", { p_revision_id: revisionId });
  if (error) throw error;
  return data;
};

export const listProductRevisions = async (productId: string, limit = 20): Promise<AdminRevision[]> => listEntityRevisions("product", productId, limit);

export const reversibleFields = (revision: AdminRevision) => {
  if (!["quick_update", "classification_update"].includes(revision.action)) return [] as string[];
  const fields = Array.isArray(revision.metadata?.fields) ? revision.metadata.fields.map(String) : [];
  return fields.filter((field) => ["price", "is_active", "brand_id", "category_id", "audience"].includes(field));
};
