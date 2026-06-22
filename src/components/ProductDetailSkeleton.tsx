import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ProductDetailSkeleton = () => (
  <div className="min-h-screen bg-background" dir="rtl">
    <Navbar />
    <main className="pt-24 pb-32">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 animate-fade-in">
          <div className="space-y-4">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="flex gap-3 justify-center">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="w-20 h-20 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-3 w-24 ml-auto" />
            <Skeleton className="h-10 w-3/4 ml-auto" />
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-8 w-40" />
            <div className="space-y-3 pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-10/12" />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default ProductDetailSkeleton;