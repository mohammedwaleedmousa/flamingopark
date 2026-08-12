import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";

const ProductDetailSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#FFF8FA]" dir="rtl">
      {/* DESKTOP NAVBAR */}
      <div className="hidden md:block">
        <Navbar />
      </div>

      {/* MOBILE TOP BAR */}
      <header className="sticky top-0 z-50 flex h-[52px] items-center justify-between border-b border-[#F1DCE3] bg-white px-2.5 md:hidden">
        <Skeleton className="h-9 w-9 rounded-full bg-[#F7E9EE]" />

        <div className="flex items-center gap-1">
          <Skeleton className="h-9 w-9 rounded-full bg-[#F7E9EE]" />
          <Skeleton className="h-9 w-9 rounded-full bg-[#F7E9EE]" />
          <Skeleton className="h-9 w-9 rounded-full bg-[#F7E9EE]" />
        </div>
      </header>

      <main className="pb-[88px] md:pb-20 md:pt-20">
        <div className="mx-auto w-full max-w-[1440px] md:px-6 md:pt-6">
          {/* DESKTOP BREADCRUMB */}
          <div className="mb-5 hidden items-center gap-2 md:flex">
            <Skeleton className="h-3 w-14 bg-[#F3E4E9]" />
            <Skeleton className="h-3 w-3 rounded-full bg-[#F3E4E9]" />
            <Skeleton className="h-3 w-16 bg-[#F3E4E9]" />
            <Skeleton className="h-3 w-3 rounded-full bg-[#F3E4E9]" />
            <Skeleton className="h-3 w-40 bg-[#F3E4E9]" />
          </div>

          {/* MAIN PRODUCT */}
          <div className="grid grid-cols-1 bg-white md:overflow-hidden md:rounded-[18px] md:border md:border-[#F1DCE3] lg:grid-cols-[minmax(0,1.08fr)_minmax(390px,0.92fr)]">
            {/* GALLERY */}
            <section className="min-w-0 bg-white lg:border-l lg:border-[#F1DCE3]">
              <div className="lg:sticky lg:top-[92px]">
                <div className="relative aspect-[1/1.05] w-full overflow-hidden bg-[#FFF3F6] sm:aspect-[1/0.9] md:aspect-[1/0.92] lg:aspect-[4/5]">
                  <Skeleton className="h-full w-full rounded-none bg-[#F5E8EC]" />

                  <Skeleton className="absolute right-3 top-3 h-6 w-12 rounded-[5px] bg-white/80 md:right-5 md:top-5" />

                  <Skeleton className="absolute bottom-3 right-3 h-6 w-11 rounded-full bg-white/80 md:bottom-5 md:right-5" />
                </div>

                {/* THUMBNAILS */}
                <div className="border-b border-[#F1DCE3] bg-white">
                  <div className="flex gap-2 overflow-hidden px-3 py-2.5 md:gap-2.5 md:px-5 md:py-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-[58px] w-[58px] shrink-0 rounded-[7px] bg-[#F7E9EE] md:h-[72px] md:w-[72px]" />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* DETAILS */}
            <section className="min-w-0 bg-white lg:px-6 lg:py-7">
              {/* TITLE / PRICE */}
              <div className="border-b border-[#F1DCE3] px-3.5 py-4 sm:px-5 lg:px-0 lg:pt-0">
                <Skeleton className="mb-2 h-3 w-20 bg-[#F5E4EA]" />

                <Skeleton className="h-5 w-[88%] bg-[#F3E4E9]" />
                <Skeleton className="mt-2 h-5 w-[62%] bg-[#F3E4E9]" />

                <div className="mt-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-3 w-3 rounded-sm bg-[#F2E2A9]" />
                    ))}
                  </div>

                  <Skeleton className="h-3 w-8 bg-[#F3E4E9]" />
                  <Skeleton className="h-3 w-14 bg-[#F3E4E9]" />
                </div>

                <div className="mt-4 flex items-end gap-2">
                  <Skeleton className="h-7 w-32 bg-[#F3DDE5]" />
                  <Skeleton className="h-3 w-16 bg-[#F3E4E9]" />
                  <Skeleton className="h-5 w-12 rounded-[4px] bg-[#FFF0F4]" />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Skeleton className="h-2 w-2 rounded-full bg-[#D8ECDD]" />
                  <Skeleton className="h-3 w-20 bg-[#F3E4E9]" />
                </div>
              </div>

              {/* QUALITY */}
              <div className="border-b border-[#F1DCE3] px-3.5 py-4 sm:px-5 lg:px-0">
                <div className="mb-3 flex items-center justify-between">
                  <Skeleton className="h-3 w-24 bg-[#F3E4E9]" />
                  <Skeleton className="h-3 w-12 bg-[#F3E4E9]" />
                </div>

                <div className="flex gap-2 overflow-hidden">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="flex min-w-[150px] items-center gap-2 rounded-[7px] border border-[#F1DCE3] p-2">
                      <Skeleton className="h-10 w-10 shrink-0 rounded-[5px] bg-[#F7E9EE]" />

                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-20 bg-[#F3E4E9]" />
                        <Skeleton className="h-3 w-14 bg-[#F3DDE5]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* COLORS */}
              <div className="border-b border-[#F1DCE3] px-3.5 py-4 sm:px-5 lg:px-0">
                <div className="mb-3 flex items-center gap-2">
                  <Skeleton className="h-3 w-10 bg-[#F3E4E9]" />
                  <Skeleton className="h-3 w-16 bg-[#F3E4E9]" />
                </div>

                <div className="flex gap-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-8 w-8 rounded-full bg-[#F5E0E7]" />
                  ))}
                </div>
              </div>

              {/* SIZE */}
              <div className="border-b border-[#F1DCE3] px-3.5 py-4 sm:px-5 lg:px-0">
                <div className="mb-3 flex items-center justify-between">
                  <Skeleton className="h-3 w-12 bg-[#F3E4E9]" />
                  <Skeleton className="h-3 w-20 bg-[#F3E4E9]" />
                </div>

                <div className="flex gap-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-8 w-16 rounded-[5px] bg-[#F8EEF1]" />
                  ))}
                </div>
              </div>

              {/* QUANTITY */}
              <div className="flex items-center justify-between border-b border-[#F1DCE3] px-3.5 py-3 sm:px-5 lg:px-0">
                <Skeleton className="h-3 w-12 bg-[#F3E4E9]" />
                <Skeleton className="h-9 w-[112px] rounded-[5px] bg-[#F8EEF1]" />
              </div>

              {/* TRUST */}
              <div className="grid grid-cols-3 border-b border-[#F1DCE3] bg-[#FFF9FA]">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className={`flex min-h-[84px] flex-col items-center justify-center px-2 ${index !== 2 ? 'border-l border-[#F1DCE3]' : ''}`}>
                    <Skeleton className="mb-2 h-5 w-5 rounded-full bg-[#F3DDE5]" />
                    <Skeleton className="h-3 w-14 bg-[#F3E4E9]" />
                    <Skeleton className="mt-1.5 h-2.5 w-10 bg-[#F6EAEE]" />
                  </div>
                ))}
              </div>

              {/* ACCORDIONS */}
              <div className="divide-y divide-[#F1DCE3]">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between px-3.5 py-4 sm:px-5 lg:px-0">
                    <Skeleton className="h-3 w-24 bg-[#F3E4E9]" />
                    <Skeleton className="h-4 w-4 rounded bg-[#F3E4E9]" />
                  </div>
                ))}
              </div>

              {/* DESKTOP ACTIONS */}
              <div className="hidden gap-2 border-t border-[#F1DCE3] pt-5 lg:flex">
                <Skeleton className="h-[48px] flex-1 rounded-[7px] bg-[#E8C5D0]" />
                <Skeleton className="h-[48px] flex-1 rounded-[7px] bg-[#F1B7C6]" />
                <Skeleton className="h-[48px] w-[48px] rounded-[7px] bg-[#F7EBEF]" />
              </div>
            </section>
          </div>

          {/* REVIEWS / QA */}
          <section className="mt-2 bg-white px-3.5 py-5 md:mt-8 md:rounded-[18px] md:border md:border-[#F1DCE3] md:px-6 md:py-8">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-28 bg-[#F3E4E9]" />
                <Skeleton className="mt-2 h-3 w-40 bg-[#F6EAEE]" />
              </div>

              <Skeleton className="h-8 w-24 rounded-[6px] bg-[#F3DDE5]" />
            </div>

            <div className="mt-5 grid grid-cols-[100px_1fr] gap-4 rounded-[10px] border border-[#F1DCE3] bg-[#FFFBFC] p-4">
              <div className="flex flex-col items-center justify-center border-l border-[#F1DCE3] pl-4">
                <Skeleton className="h-9 w-14 bg-[#F3E4E9]" />

                <div className="mt-2 flex gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-3 w-3 bg-[#F2E2A9]" />
                  ))}
                </div>

                <Skeleton className="mt-2 h-2.5 w-14 bg-[#F6EAEE]" />
              </div>

              <div className="flex flex-col justify-center gap-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Skeleton className="h-2.5 w-3 bg-[#F3E4E9]" />
                    <Skeleton className="h-1.5 flex-1 rounded-full bg-[#F5E6EA]" />
                    <Skeleton className="h-2.5 w-4 bg-[#F3E4E9]" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="border-t border-[#F1E4E8] pt-4 first:border-t-0 first:pt-0">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full bg-[#FFF0F4]" />

                    <div className="flex-1">
                      <Skeleton className="h-3 w-24 bg-[#F3E4E9]" />
                      <Skeleton className="mt-2 h-2.5 w-16 bg-[#F6EAEE]" />
                    </div>
                  </div>

                  <Skeleton className="mr-12 mt-3 h-3 w-[75%] bg-[#F3E4E9]" />
                  <Skeleton className="mr-12 mt-2 h-3 w-[55%] bg-[#F3E4E9]" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* MOBILE BUY BAR */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#F1DCE3] bg-white/95 px-2.5 pt-2 backdrop-blur-xl lg:hidden" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        <div className="flex h-[50px] gap-2">
          <Skeleton className="h-full w-[48px] shrink-0 rounded-[6px] bg-[#F6E8ED]" />
          <Skeleton className="h-full flex-1 rounded-[6px] bg-[#E5B5C4]" />
          <Skeleton className="h-full flex-1 rounded-[6px] bg-[#F0A9BC]" />
        </div>
      </div>
    </div>
  );
};

export default ProductDetailSkeleton;