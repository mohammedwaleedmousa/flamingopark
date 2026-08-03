import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bot, MessageCircle, Send, X } from "lucide-react";
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
    setMessages((current) => [...current, { id: nextMessageId.current++, role: "user", text: question }]);
    setInput("");
    setIsReplying(true);
    await answer(question);
    setIsReplying(false);
  };

  return (
    <div className="fixed bottom-5 left-4 z-[60]" dir="rtl">
      {open && (
        <section className="mb-3 flex h-[min(560px,calc(100vh-7rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden border border-border bg-background shadow-2xl">
          <header className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2"><Bot className="h-5 w-5" /><div><p className="text-sm font-semibold">مساعد فلامنجو</p><p className="text-[11px] opacity-80">مساعد المنتجات والمتجر</p></div></div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center hover:bg-black/10" aria-label="إغلاق المحادثة"><X className="h-4 w-4" /></button>
          </header>
          <div ref={messageListRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-3">
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "mr-auto max-w-[85%]" : "max-w-[85%]"}>
                <p className={`px-3 py-2 text-sm leading-6 ${message.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground"}`}>{message.text}</p>
                {message.products?.map((product) => (
                  <Link key={product.id} to={`/product/${product.slug}`} onClick={() => setOpen(false)} className="mt-2 flex items-center gap-2 border border-border bg-background p-2 transition-colors hover:bg-muted">
                    <img src={optimizeImage(product.images[0], 120, 85)} alt="" className="h-12 w-12 object-cover" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{product.nameAr}</span><span className="text-xs text-muted-foreground">{product.price.toLocaleString("ar-EG")} ر.ي</span></span>
                  </Link>
                ))}
              </div>
            ))}
            {isReplying && <div className="w-fit border border-border bg-background px-3 py-2 text-xs text-muted-foreground">جاري البحث...</div>}
          </div>
          <div className="border-t border-border p-3">
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="mb-2 block text-center text-xs font-medium text-primary hover:underline">التواصل مع فريق الدعم عبر واتساب</a>
            <form onSubmit={handleSubmit} className="flex gap-2"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="اكتب استفسارك..." className="h-10 min-w-0 flex-1 border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /><button type="submit" disabled={isReplying} className="grid h-10 w-10 place-items-center bg-primary text-primary-foreground disabled:opacity-50" aria-label="إرسال"><Send className="h-4 w-4" /></button></form>
          </div>
        </section>
      )}
      <button type="button" onClick={() => setOpen((current) => !current)} className="grid h-14 w-14 place-items-center bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105" aria-label={open ? "إغلاق مساعد المتجر" : "فتح مساعد المتجر"}>
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
};

export default CustomerAssistant;