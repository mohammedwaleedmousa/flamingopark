const ProductCardSkeleton = ({ index = 0 }: { index?: number }) => (
  <div
    className="block animate-fade-in"
    dir="rtl"
    style={{ animationDelay: `${index * 60}ms` }}
  >
    <div className="aspect-[3/4] w-full skeleton-wave" style={{ animationDelay: `${index * 80}ms` }} />
    <div className="mt-4 px-1 flex flex-col items-center gap-2">
      <div className="h-2 w-16 skeleton-wave" />
      <div className="h-4 w-3/4 skeleton-wave" />
      <div className="h-3 w-1/3 mt-1 skeleton-wave" />
    </div>
  </div>
);

export default ProductCardSkeleton;