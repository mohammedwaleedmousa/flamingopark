import { Skeleton } from "@/components/ui/skeleton";

const ProductCardSkeleton = () => (
  <div className="block" dir="rtl">
    <Skeleton className="aspect-[3/4] w-full rounded-none" />
    <div className="mt-4 px-1 flex flex-col items-center gap-2">
      <Skeleton className="h-2 w-16 rounded-none" />
      <Skeleton className="h-4 w-3/4 rounded-none" />
      <Skeleton className="h-3 w-1/3 mt-1 rounded-none" />
    </div>
  </div>
);

export default ProductCardSkeleton;