import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Plus, ShoppingBag } from "lucide-react";
import { Product, useStore } from "@/store/useStore";
import { toast } from "@/hooks/use-toast";

interface Props {
  current: Product;
  related: Product[];
  currency?: string;
}

const finalPrice = (p: Product) =>
  p.discount ? p.price * (1 - p.discount / 100) : p.price;

const FrequentlyBoughtTogether = ({ current, related, currency = "ر.ي" }: Props) => {
  const companions = useMemo(() => related.slice(0, 2), [related]);
  const initial: Record<string, boolean> = {
    [current.id]: true,
    ...Object.fromEntries(companions.map((p) => [p.id, true])),
  };
  const [picked, setPicked] = useState<Record<string, boolean>>(initial);
  const { addToCart, openCart } = useStore();

  if (companions.length === 0) return null;

  const all = [current, ...companions];
  const total = all.filter((p) => picked[p.id]).reduce((s, p) => s + finalPrice(p), 0);
  const selectedCount = all.filter((p) => picked[p.id]).length;

  const handleAddAll = () => {
    all.filter((p) => picked[p.id]).forEach((p) => addToCart(p, 1));
    toast({ title: `أُضيفت ${selectedCount} قطع إلى السلة` });
    openCart();
  };

  return (
    <section className="mt-20 pt-12 border-t border-border" dir="rtl">
      <div className="text-center mb-10">
        <p className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground mb-3">
          Frequently Bought Together
        </p>
        <h2 className="font-heading text-2xl md:text-3xl text-foreground">
          يُشترى معاً عادةً
        </h2>
      </div>

      <div className="grid lg:grid-cols-[1fr,320px] gap-8 lg:gap-12 items-start">
        {/* Products row */}
        <div className="flex items-center justify-center gap-3 md:gap-6 flex-wrap">
          {all.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 md:gap-6">
              <Link
                to={`/product/${p.slug}`}
                className="group block w-28 md:w-40"
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {p.images?.[0] && (
                    <img
                      src={p.images[0]}
                      alt={p.nameAr}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setPicked((prev) => ({ ...prev, [p.id]: !prev[p.id] }));
                    }}
                    aria-label="toggle"
                    className={`absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center border transition ${
                      picked[p.id]
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background/90 text-foreground border-border"
                    }`}
                  >
                    {picked[p.id] && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-center font-medium text-foreground line-clamp-2 leading-snug">
                  {p.nameAr}
                </p>
                <p className="text-[11px] text-center text-muted-foreground mt-0.5">
                  {finalPrice(p).toFixed(0)} {currency}
                </p>
              </Link>
              {i < all.length - 1 && (
                <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-muted/40 border border-border p-6">
          <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-3">
            إجمالي الباقة
          </p>
          <p className="font-heading text-3xl text-foreground mb-1">
            {total.toFixed(0)} <span className="text-base">{currency}</span>
          </p>
          <p className="text-xs text-muted-foreground mb-5">
            {selectedCount} من {all.length} منتجات مختارة
          </p>
          <button
            disabled={selectedCount === 0}
            onClick={handleAddAll}
            className="w-full bg-foreground text-background py-3 text-[11px] tracking-[0.35em] uppercase flex items-center justify-center gap-2 disabled:opacity-40 hover:opacity-90 transition active:scale-[0.98]"
          >
            <ShoppingBag className="w-4 h-4" />
            أضف الكل إلى السلة
          </button>
        </div>
      </div>
    </section>
  );
};

export default FrequentlyBoughtTogether;