import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import { optimizeImage } from "@/lib/imageUrl";

type Message = { id: number; role: "assistant" | "user"; text: string; products?: ReturnType<typeof mapProductCard>[] };
type ProductResult = ReturnType<typeof mapProductCard>;
type ChatbotConfig = { enabled: boolean; greeting: string; faqs: Array<{ question: string; answer: string }> };

const welcomeMessage: Message = {
  id: 1,
  role: "assistant",
  text: "أهلاً بك. أنا دليل فلامنجو الافتراضي، ويسعدني مساعدتك في اختيار المنتجات ومعرفة الأسعار والتوفر والشحن.",
};

const normalize = (value: string) => value.trim().toLowerCase();
const ignoredSearchWords = new Set(["اريد", "أريد", "ابغى", "أبغى", "هل", "في", "من", "عن", "مع", "ما", "هو", "هذه", "هذا", "منتج", "منتجات", "ال", "لي"]);
const defaultChatbotConfig: ChatbotConfig = { enabled: true, greeting: welcomeMessage.text, faqs: [] };

const CustomerAssistant = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [isReplying, setIsReplying] = useState(false);
  const [whatsapp, setWhatsapp] = useState("967778579777");
  const [chatbotConfig, setChatbotConfig] = useState<ChatbotConfig>(defaultChatbotConfig);
  const nextMessageId = useRef(2);
  const messageListRef = useRef<HTMLDivElement>(null);
  const lastSuggestedProducts = useRef<ProductResult[]>([]);
  const aiAvailable = useRef(true);
  const siteKnowledge = useRef<Array<{ title: string; text: string }>>([]);

  useEffect(() => {
    if (!open) return;
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    supabase.from("site_settings").select("key,value").in("key", ["whatsapp", "whatsapp_ye", "whatsapp_sa", "chatbot_config"])
      .then(({ data }) => {
        const setting = data?.find((item) => item.key === "whatsapp" || item.key === "whatsapp_ye" || item.key === "whatsapp_sa");
        if (setting?.value) setWhatsapp(String(setting.value).replace(/\D/g, ""));
        const config = data?.find((item) => item.key === "chatbot_config")?.value;
        if (config && typeof config === "object" && !Array.isArray(config)) {
          const parsed = config as Partial<ChatbotConfig>;
          const nextConfig = { enabled: parsed.enabled !== false, greeting: parsed.greeting || defaultChatbotConfig.greeting, faqs: Array.isArray(parsed.faqs) ? parsed.faqs.filter((faq): faq is { question: string; answer: string } => Boolean(faq?.question && faq?.answer)) : [] };
          setChatbotConfig(nextConfig);
          setMessages((current) => current.length === 1 ? [{ ...current[0], text: nextConfig.greeting }] : current);
        }
      });
    supabase.from("site_content").select("title,content,content_ar").then(({ data }) => {
      siteKnowledge.current = (data || []).map((item) => ({ title: item.title, text: `${item.content_ar || ""} ${item.content || ""}`.trim() })).filter((item) => item.text);
    });
  }, []);

  if (!chatbotConfig.enabled || pathname.startsWith("/admin") || pathname === "/auth" || pathname === "/signin" || pathname === "/signup") return null;

  const addAssistantMessage = (text: string, products?: ReturnType<typeof mapProductCard>[]) => {
    setMessages((current) => [...current, { id: nextMessageId.current++, role: "assistant", text, products }]);
  };

  const requestAiReply = async (question: string) => {
    if (!aiAvailable.current) return null;
    const history = messages.slice(-6).map(({ role, text }) => ({ role, text }));
    const { data, error } = await supabase.functions.invoke("customer-assistant", { body: { message: question, history } });
    if (error || !data?.reply) {
      aiAvailable.current = false;
      return null;
    }
    return String(data.reply);
  };

  const answer = async (question: string) => {
    const term = normalize(question);
    const aiReply = await requestAiReply(question);
    if (aiReply) {
      addAssistantMessage(aiReply);
      return;
    }
    if (/^((مرحبا|مرحب|هلا|اهلا|أهلا|السلام|هاي|hello|hi)[!،. ]*)+$/.test(term)) {
      addAssistantMessage("أهلاً بك. أخبرني بما تبحث عنه وسأساعدك في إيجاد المنتج المناسب أو معرفة السعر والتوفر.");
      return;
    }
    if (/شحن|توصيل|يوصل|مدة/.test(term)) {
      addAssistantMessage("التوصيل داخل عدن في اليوم نفسه، وإلى بقية المحافظات عادة خلال 2 إلى 7 أيام حسب إجراءات الشحن.");
      return;
    }
    if (/ارجاع|إرجاع|استبدال|استرجاع/.test(term)) {
      addAssistantMessage("يمكنك طلب الإرجاع أو الاستبدال وفق سياسة المنتج. تواصل معنا عبر واتساب مع رقم طلبك وسنساعدك مباشرة.");
      return;
    }
    if (/واتساب|تواصل|مساعدة|موظف|دعم/.test(term)) {
      addAssistantMessage("يمكنك التواصل مع فريقنا مباشرة عبر واتساب من الزر أدناه.");
      return;
    }
    if (/دفع|ادفع|بطاقة|تحويل|كاش|نقد/.test(term)) {
      addAssistantMessage("ستظهر لك وسائل الدفع المتاحة وخيارات التحويل عند إتمام الطلب. إذا واجهت أي مشكلة في الدفع، راسلنا عبر واتساب وسنساعدك فورًا.");
      return;
    }
    if (/مقاس|قياس|حجم/.test(term)) {
      addAssistantMessage("ستجد المقاسات المتاحة داخل صفحة كل منتج. اختر اللون أولًا عند وجود ألوان متعددة، ثم اختر المقاس المناسب قبل الإضافة للسلة.");
      return;
    }

    const faq = chatbotConfig.faqs.find((item) => normalize(item.question).split(/\s+/).filter((word) => word.length > 2).some((word) => term.includes(word)));
    if (faq) {
      addAssistantMessage(faq.answer);
      return;
    }

    if (/متوفر|توفر|مخزون|نفد/.test(term) && /هذا|هذه|الاول|الأول|الثاني|الثانية/.test(term) && lastSuggestedProducts.current.length > 0) {
      const product = /الثاني|الثانية/.test(term) ? lastSuggestedProducts.current[1] : lastSuggestedProducts.current[0];
      if (product) {
        addAssistantMessage(`${product.nameAr} ${product.inStock ? "متوفر حاليًا ويمكنك فتح المنتج لاختيار اللون أو المقاس." : "غير متوفر حاليًا."}`, [product]);
        return;
      }
    }

    const words = term.split(/\s+/).map((word) => word.replace(/[^\p{L}\p{N}]/gu, "")).filter((word) => word.length > 1 && !ignoredSearchWords.has(word)).slice(0, 4);
    if (words.length === 0) {
      addAssistantMessage("اكتب اسم المنتج أو نوعه، مثل: ساعة ذهبية أو حقيبة جلد، ويمكنك أيضًا تحديد ميزانيتك مثل: حقيبة أقل من 20,000.");
      return;
    }

    const pageContent = siteKnowledge.current.find((item) => words.some((word) => `${item.title} ${item.text}`.toLowerCase().includes(word)));
    if (pageContent) {
      addAssistantMessage(`${pageContent.title}: ${pageContent.text.slice(0, 500)}`);
      return;
    }

    const pattern = words.map((word) => `name_ar.ilike.%${word}%,name.ilike.%${word}%,description_ar.ilike.%${word}%`).join(",");
    const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true).or(pattern).limit(30);
    if (error || !data?.length) {
      addAssistantMessage("لم أجد منتجًا مطابقًا بوضوح. جرّب كتابة اسم المنتج أو الماركة، أو تواصل معنا عبر واتساب للمساعدة.");
      return;
    }
    const priceMatch = term.match(/(?:اقل|أقل|تحت|حدود|بحدود|من)\s*(\d[\d,،.]*)/);
    const maxPrice = priceMatch ? Number(priceMatch[1].replace(/[,،.]/g, "")) : null;
    const products = data.map(mapProductCard)
      .filter((product) => !maxPrice || product.price <= maxPrice)
      .sort((first, second) => {
        const firstText = `${first.nameAr} ${first.name} ${first.brand} ${first.descriptionAr}`.toLowerCase();
        const secondText = `${second.nameAr} ${second.name} ${second.brand} ${second.descriptionAr}`.toLowerCase();
        const score = (text: string, product: ProductResult) => words.reduce((total, word) => total + (text.includes(word) ? 3 : 0) + (product.nameAr.toLowerCase().includes(word) ? 4 : 0), product.inStock ? 1 : 0);
        return score(secondText, second) - score(firstText, first);
      })
      .slice(0, 3);
    if (products.length === 0) {
      addAssistantMessage("لم أجد منتجًا ضمن هذه الميزانية. جرّب رفع الحد أو اكتب نوع المنتج الذي تريده.");
      return;
    }
    lastSuggestedProducts.current = products;
    const availableCount = products.filter((product) => product.inStock).length;
    addAssistantMessage(`رشحت لك ${products.length} منتجات${maxPrice ? ` ضمن ${maxPrice.toLocaleString("ar-EG")} ر.ي` : ""}. المتوفر منها الآن: ${availableCount}.`, products);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const question = input.trim();
    if (!question || isReplying) return;
    await submitQuestion(question);
    setInput("");
  };

  const submitQuestion = async (question: string) => {
    if (isReplying) return;
    setMessages((current) => [...current, { id: nextMessageId.current++, role: "user", text: question }]);
    setIsReplying(true);
    await answer(question);
    setIsReplying(false);
  };

  const askQuickQuestion = (question: string) => {
    void submitQuestion(question);
  };

  return (
    <div className="fixed bottom-5 left-4 z-[60] max-sm:bottom-3 max-sm:left-3" dir="rtl">
      {open && (
        <section className="absolute bottom-16 left-0 flex h-[min(600px,calc(100vh-5.5rem))] w-[min(410px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg border border-border/80 bg-background shadow-[0_24px_70px_-30px_rgba(35,21,26,0.45)]">
          <header className="flex items-center justify-between border-b border-primary/15 bg-[#fff8fa] px-5 py-4">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm"><Bot className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-foreground">دليل فلامنجو</p><p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> مساعد افتراضي متاح الآن</p></div></div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground" aria-label="إغلاق المحادثة"><X className="h-4 w-4" /></button>
          </header>
          <div ref={messageListRef} className="flex-1 space-y-4 overflow-y-auto bg-[#fffdfd] p-4">
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "mr-auto max-w-[85%]" : "max-w-[85%]"}>
                <p className={`rounded-lg px-3.5 py-2.5 text-sm leading-6 shadow-sm ${message.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground"}`}>{message.text}</p>
                {message.products?.map((product) => (
                  <Link key={product.id} to={`/product/${product.slug}`} onClick={() => setOpen(false)} className="mt-2 flex items-center gap-3 rounded-md border border-border bg-background p-2.5 transition-colors hover:border-primary/40 hover:bg-muted/40">
                    <img src={optimizeImage(product.images[0], 160, 90)} alt="" className="h-14 w-12 rounded-sm object-cover" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{product.nameAr}</span><span className="mt-1 block text-xs text-primary">{product.price.toLocaleString("ar-EG")} ر.ي</span></span>
                  </Link>
                ))}
              </div>
            ))}
            {messages.length === 1 && !isReplying && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-muted-foreground">أسئلة سريعة</p>
                <div className="flex flex-wrap gap-2">
                  {["أريد ساعة", "ما مدة التوصيل؟", "كيف أستبدل منتجًا؟"].map((question) => <button key={question} type="button" onClick={() => askQuickQuestion(question)} className="rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary">{question}</button>)}
                </div>
              </div>
            )}
            {isReplying && <div className="flex w-fit items-center gap-2 border border-border bg-background px-3 py-2 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" /> جاري البحث...</div>}
          </div>
          <div className="border-t border-border bg-background p-4">
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="mb-3 block text-center text-xs font-medium text-primary hover:underline">التواصل المباشر مع فريق الدعم عبر واتساب</a>
            <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-md border border-input bg-muted/30 p-1.5 focus-within:ring-2 focus-within:ring-ring"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="اكتب استفسارك..." className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" /><button type="submit" disabled={isReplying} className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground disabled:opacity-50" aria-label="إرسال"><Send className="h-4 w-4" /></button></form>
          </div>
        </section>
      )}
      <button type="button" onClick={() => setOpen((current) => !current)} className="grid h-14 w-14 place-items-center rounded-lg border border-primary/20 bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105" aria-label={open ? "إغلاق مساعد المتجر" : "فتح مساعد المتجر"}>
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
};

export default CustomerAssistant;