import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import { optimizeImage } from "@/lib/imageUrl";

type Message = { id: number; role: "assistant" | "user"; text: string; products?: ReturnType<typeof mapProductCard>[] };

const welcomeMessage: Message = {
  id: 1,
  role: "assistant",
  text: "أهلاً بك، أنا مساعد فلامنجو بارك. اسألني عن المنتجات، الأسعار، التوفر، الشحن أو الإرجاع.",
};

const normalize = (value: string) => value.trim().toLowerCase();

const CustomerAssistant = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [isReplying, setIsReplying] = useState(false);
  const [whatsapp, setWhatsapp] = useState("967778579777");
  const nextMessageId = useRef(2);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    supabase.from("site_settings").select("key,value").in("key", ["whatsapp", "whatsapp_ye", "whatsapp_sa"])
      .then(({ data }) => {
        const setting = data?.find((item) => item.key === "whatsapp" || item.key === "whatsapp_ye" || item.key === "whatsapp_sa");
        if (setting?.value) setWhatsapp(String(setting.value).replace(/\D/g, ""));
      });
  }, []);

  if (pathname.startsWith("/admin") || pathname === "/auth" || pathname === "/signin" || pathname === "/signup") return null;

  const addAssistantMessage = (text: string, products?: ReturnType<typeof mapProductCard>[]) => {
    setMessages((current) => [...current, { id: nextMessageId.current++, role: "assistant", text, products }]);
  };

  const answer = async (question: string) => {
    const term = normalize(question);
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

    const words = term.split(/\s+/).filter((word) => word.length > 1).slice(0, 3);
    if (words.length === 0) {
      addAssistantMessage("اكتب اسم المنتج أو نوعه، مثل: ساعة ذهبية أو حقيبة جلد.");
      return;
    }

    const pattern = words.map((word) => `name_ar.ilike.%${word}%,name.ilike.%${word}%,description_ar.ilike.%${word}%`).join(",");
    const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true).or(pattern).limit(3);
    if (error || !data?.length) {
      addAssistantMessage("لم أجد منتجًا مطابقًا بوضوح. جرّب كتابة اسم المنتج أو الماركة، أو تواصل معنا عبر واتساب للمساعدة.");
      return;
    }
    const products = data.map(mapProductCard);
    addAssistantMessage("وجدت هذه المنتجات التي قد تناسب طلبك:", products);
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
    <div className="fixed bottom-5 left-4 z-[60]" dir="rtl">
      {open && (
        <section className="absolute bottom-16 left-0 flex h-[min(580px,calc(100vh-6rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden border border-border bg-background shadow-2xl">
          <header className="flex items-center justify-between border-b border-primary/20 bg-primary px-5 py-4 text-primary-foreground">
            <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center bg-white/15"><Bot className="h-5 w-5" /></span><div><p className="text-sm font-semibold">مساعد فلامنجو</p><p className="mt-0.5 flex items-center gap-1 text-[11px] opacity-90"><span className="h-1.5 w-1.5 bg-emerald-300" /> متصل لمساعدتك</p></div></div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center border border-white/20 hover:bg-white/10" aria-label="إغلاق المحادثة"><X className="h-4 w-4" /></button>
          </header>
          <div ref={messageListRef} className="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4">
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "mr-auto max-w-[85%]" : "max-w-[85%]"}>
                <p className={`px-3.5 py-2.5 text-sm leading-6 shadow-sm ${message.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground"}`}>{message.text}</p>
                {message.products?.map((product) => (
                  <Link key={product.id} to={`/product/${product.slug}`} onClick={() => setOpen(false)} className="mt-2 flex items-center gap-3 border border-border bg-background p-2.5 transition-colors hover:bg-muted">
                    <img src={optimizeImage(product.images[0], 160, 90)} alt="" className="h-14 w-12 object-cover" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{product.nameAr}</span><span className="mt-1 block text-xs text-primary">{product.price.toLocaleString("ar-EG")} ر.ي</span></span>
                  </Link>
                ))}
              </div>
            ))}
            {messages.length === 1 && !isReplying && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-muted-foreground">أسئلة سريعة</p>
                <div className="flex flex-wrap gap-2">
                  {["أريد ساعة", "ما مدة التوصيل؟", "كيف أستبدل منتجًا؟"].map((question) => <button key={question} type="button" onClick={() => askQuickQuestion(question)} className="border border-border bg-background px-3 py-2 text-xs hover:border-primary hover:text-primary">{question}</button>)}
                </div>
              </div>
            )}
            {isReplying && <div className="flex w-fit items-center gap-2 border border-border bg-background px-3 py-2 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" /> جاري البحث...</div>}
          </div>
          <div className="border-t border-border bg-background p-4">
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="mb-3 block text-center text-xs font-medium text-primary hover:underline">التواصل المباشر مع فريق الدعم عبر واتساب</a>
            <form onSubmit={handleSubmit} className="flex items-center gap-2 border border-input bg-muted/30 p-1.5 focus-within:ring-2 focus-within:ring-ring"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="اكتب استفسارك..." className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" /><button type="submit" disabled={isReplying} className="grid h-9 w-9 place-items-center bg-primary text-primary-foreground disabled:opacity-50" aria-label="إرسال"><Send className="h-4 w-4" /></button></form>
          </div>
        </section>
      )}
      <button type="button" onClick={() => setOpen((current) => !current)} className="grid h-14 w-14 place-items-center border border-primary/20 bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105" aria-label={open ? "إغلاق مساعد المتجر" : "فتح مساعد المتجر"}>
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
};

export default CustomerAssistant;