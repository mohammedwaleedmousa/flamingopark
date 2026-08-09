import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Plus, ShoppingBag } from "lucide-react";
import { Product, useStore } from "@/store/useStore";
import { toast } from "@/hooks/use-toast";
import { firstProductImage, handleImageError, optimizeImage } from "@/lib/imageUrl";
import { preloadCustomerRoute } from "@/lib/customerRoutePreload";

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
    <section className="mt-20 border-t border-border pt-12" dir="rtl">
      <div className="mb-8">
        <p className="mb-2 text-[10px] tracking-[0.2em] text-muted-foreground">تنسيق مقترح</p>
        <h2 className="font-heading text-2xl text-foreground md:text-3xl">يُكمل إطلالتك</h2>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr,300px] lg:gap-10">
        {/* Products row */}
        <div className="flex flex-wrap items-start gap-3 md:gap-5">
          {all.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 md:gap-6">
              <Link
                to={`/product/${p.slug}`}
                onPointerEnter={() => preloadCustomerRoute(`/product/${p.slug}`)}
                onFocus={() => preloadCustomerRoute(`/product/${p.slug}`)}
                className="group block w-28 md:w-36"
              >
                <div className="relative aspect-[4/5] overflow-hidden border border-border bg-muted">
                  {firstProductImage(p) !== "/placeholder.svg" && (
                    <img
                      src={optimizeImage(firstProductImage(p), 420, 88)}
                      alt={p.nameAr}
                      loading="lazy"
                      decoding="async"
                      onError={handleImageError}
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
                    className={`absolute right-2 top-2 grid h-7 w-7 place-items-center border transition ${
                      picked[p.id]
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background/90 text-foreground border-border"
                    }`}
                  >
                    {picked[p.id] && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-foreground">
                  {p.nameAr}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {finalPrice(p).toFixed(0)} {currency}
                </p>
              </Link>
              {i < all.length - 1 && (
                <Plus className="mt-16 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="border border-border bg-card p-5">
          <p className="mb-2 text-xs text-muted-foreground">القطع المختارة</p>
          <p className="mb-1 font-heading text-3xl text-foreground">
            {total.toFixed(0)} <span className="text-base">{currency}</span>
          </p>
          <p className="mb-5 text-xs text-muted-foreground">
            {selectedCount} من {all.length} منتجات مختارة
          </p>
          <button
            disabled={selectedCount === 0}
            onClick={handleAddAll}
            className="btn-unified w-full gap-2 py-3 disabled:opacity-40"
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
