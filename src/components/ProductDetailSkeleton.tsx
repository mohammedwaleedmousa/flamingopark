import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";

const ProductDetailSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#FFFDFC]" dir="rtl">
      {/* DESKTOP NAVBAR */}
      <div className="hidden md:block">
        <Navbar />
      </div>

      {/* MOBILE HEADER */}
      <header className="sticky top-0 z-50 flex h-[50px] items-center justify-between border-b border-[#EEE4E0] bg-white px-2 md:hidden">
        <Skeleton className="h-9 w-9 rounded-full bg-[#F1EBE8]" />

        <Skeleton className="absolute left-1/2 top-1/2 h-[38px] w-[38px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F3ECE9]" />

        <div className="flex items-center">
          <Skeleton className="h-9 w-9 rounded-full bg-[#F1EBE8]" />
          <Skeleton className="h-9 w-9 rounded-full bg-[#F1EBE8]" />
          <Skeleton className="h-9 w-9 rounded-full bg-[#F1EBE8]" />
        </div>
      </header>

      <main className="pb-[88px] md:pb-16 md:pt-4">
        <div className="mx-auto w-full max-w-[1380px] md:px-6">
          {/* BREADCRUMB */}
          <div className="mb-4 hidden items-center gap-2 md:flex">
            <Skeleton className="h-2.5 w-12 rounded-full bg-[#EEE7E4]" />
            <Skeleton className="h-2 w-2 rounded-full bg-[#EAE2DF]" />
            <Skeleton className="h-2.5 w-14 rounded-full bg-[#EEE7E4]" />
            <Skeleton className="h-2 w-2 rounded-full bg-[#EAE2DF]" />
            <Skeleton className="h-2.5 w-36 rounded-full bg-[#EEE7E4]" />
          </div>

          {/* MAIN PRODUCT */}
          <div className="grid grid-cols-1 bg-white md:overflow-hidden md:rounded-[18px] md:border md:border-[#EDE3DF] lg:grid-cols-[minmax(0,1.08fr)_minmax(390px,0.92fr)]">
            {/* GALLERY */}
            <section className="min-w-0 bg-white lg:border-l lg:border-[#EDE3DF]">
              <div className="lg:sticky lg:top-[98px]">
                {/* MAIN IMAGE */}
                <div className="relative h-[56svh] min-h-[410px] max-h-[520px] w-full overflow-hidden bg-[#F4F2F0] sm:h-[60svh] sm:min-h-[450px] sm:max-h-[600px] md:h-auto md:min-h-0 md:max-h-none md:aspect-[4/5]">
                  <Skeleton className="absolute inset-0 h-full w-full rounded-none bg-[#EEEAE7]" />

                  <Skeleton className="absolute right-3 top-3 h-[23px] w-10 rounded-[6px] bg-white/80 md:right-5 md:top-5" />

                  <Skeleton className="absolute bottom-3 right-3 h-[24px] w-12 rounded-full bg-white/85" />

                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 md:hidden">
                    <Skeleton className="h-1 w-4 rounded-full bg-[#DCCBC7]" />
                    <Skeleton className="h-1 w-1 rounded-full bg-[#D9D0CD]" />
                    <Skeleton className="h-1 w-1 rounded-full bg-[#D9D0CD]" />
                    <Skeleton className="h-1 w-1 rounded-full bg-[#D9D0CD]" />
                  </div>
                </div>

                {/* THUMBNAILS */}
                <div className="border-b border-[#EEE4E0] bg-white">
                  <div className="flex gap-2 overflow-hidden px-2.5 py-2.5 md:px-4 md:py-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-[58px] w-[58px] shrink-0 rounded-[9px] bg-[#F1ECE9] md:h-[68px] md:w-[68px]" />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* DETAILS */}
            <section className="min-w-0 bg-white lg:px-6 lg:py-6">
              {/* TITLE */}
              <div className="border-b border-[#EEE4E0] px-3.5 py-4 sm:px-5 lg:px-0 lg:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <Skeleton className="h-[2px] w-3 rounded-full bg-[#DAB4B0]" />
                      <Skeleton className="h-2 w-16 rounded-full bg-[#EEE3DF]" />
                    </div>

                    <Skeleton className="h-5 w-[88%] rounded-[5px] bg-[#ECE6E3]" />
                    <Skeleton className="mt-2 h-5 w-[58%] rounded-[5px] bg-[#F0EAE7]" />
                  </div>

                  <div className="hidden shrink-0 items-center gap-1 lg:flex">
                    <Skeleton className="h-8 w-8 rounded-full bg-[#F3EEEB]" />
                    <Skeleton className="h-8 w-8 rounded-full bg-[#F3EEEB]" />
                  </div>
                </div>

                {/* RATING */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex gap-[2px]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-[11px] w-[11px] rounded-[2px] bg-[#E8D49E]" />
                    ))}
                  </div>

                  <Skeleton className="h-2 w-6 rounded-full bg-[#EEE7E4]" />
                  <Skeleton className="h-2 w-12 rounded-full bg-[#EEE7E4]" />
                </div>

                {/* PRICE */}
                <div className="mt-4 flex items-end gap-2">
                  <Skeleton className="h-6 w-28 rounded-[5px] bg-[#E8D4D1]" />
                  <Skeleton className="h-2.5 w-14 rounded-full bg-[#EEE7E4]" />
                  <Skeleton className="h-[18px] w-12 rounded-full bg-[#F5E9E7]" />
                </div>

                {/* STOCK */}
                <div className="mt-3 flex items-center gap-2">
                  <Skeleton className="h-1.5 w-1.5 rounded-full bg-[#BFCDBF]" />
                  <Skeleton className="h-2 w-20 rounded-full bg-[#E8EEE8]" />
                </div>
              </div>

              {/* QUALITY */}
              <div className="border-b border-[#EEE4E0] px-3.5 py-4 sm:px-5 lg:px-0">
                <div className="mb-3 flex items-center justify-between">
                  <Skeleton className="h-2.5 w-20 rounded-full bg-[#EEE7E4]" />
                  <Skeleton className="h-2 w-10 rounded-full bg-[#F0EAE7]" />
                </div>

                <div className="flex gap-2 overflow-hidden">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="flex min-w-[145px] items-center gap-2 rounded-[10px] border border-[#E9DFDB] p-2">
                      <Skeleton className="h-10 w-10 shrink-0 rounded-[7px] bg-[#F1ECE9]" />

                      <div className="flex-1">
                        <Skeleton className="h-2.5 w-16 rounded-full bg-[#ECE5E2]" />
                        <Skeleton className="mt-2 h-2.5 w-12 rounded-full bg-[#E8D6D2]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* COLORS */}
              <div className="border-b border-[#EEE4E0] px-3.5 py-4 sm:px-5 lg:px-0">
                <div className="mb-3 flex items-center gap-2">
                  <Skeleton className="h-2.5 w-8 rounded-full bg-[#ECE5E2]" />
                  <Skeleton className="h-2 w-14 rounded-full bg-[#F0EAE7]" />
                </div>

                <div className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full bg-[#D8C5C1]" />
                  <Skeleton className="h-8 w-8 rounded-full bg-[#D9D6D2]" />
                  <Skeleton className="h-8 w-8 rounded-full bg-[#C9C2BB]" />
                  <Skeleton className="h-8 w-8 rounded-full bg-[#E5D8D2]" />
                </div>
              </div>

              {/* SIZE */}
              <div className="border-b border-[#EEE4E0] px-3.5 py-4 sm:px-5 lg:px-0">
                <div className="mb-3 flex items-center justify-between">
                  <Skeleton className="h-2.5 w-10 rounded-full bg-[#ECE5E2]" />
                  <Skeleton className="h-2 w-16 rounded-full bg-[#F0EAE7]" />
                </div>

                <div className="flex gap-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-[34px] w-[58px] rounded-[8px] bg-[#F4EFEC]" />
                  ))}
                </div>
              </div>

              {/* QUANTITY */}
              <div className="flex items-center justify-between border-b border-[#EEE4E0] px-3.5 py-3 sm:px-5 lg:px-0">
                <div>
                  <Skeleton className="h-2.5 w-10 rounded-full bg-[#ECE5E2]" />
                  <Skeleton className="mt-2 h-1.5 w-16 rounded-full bg-[#F0EAE7]" />
                </div>

                <Skeleton className="h-9 w-[112px] rounded-[9px] bg-[#F2EDEA]" />
              </div>

              {/* FEATURES */}
              <div className="grid grid-cols-3 border-b border-[#EEE4E0] bg-[#FFFBFA]">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className={`flex min-h-[72px] flex-col items-center justify-center px-2 py-2.5 ${index !== 2 ? "border-l border-[#EEE4E0]" : ""}`}>
                    <Skeleton className="mb-2 h-4 w-4 rounded-full bg-[#E6D2CF]" />
                    <Skeleton className="h-2 w-12 rounded-full bg-[#ECE5E2]" />
                    <Skeleton className="mt-1.5 h-1.5 w-9 rounded-full bg-[#F0EAE7]" />
                  </div>
                ))}
              </div>

              {/* ACCORDIONS */}
              <div className="divide-y divide-[#EEE4E0]">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between px-3.5 py-4 sm:px-5 lg:px-0">
                    <Skeleton className="h-2.5 w-20 rounded-full bg-[#ECE5E2]" />
                    <Skeleton className="h-3.5 w-3.5 rounded-[3px] bg-[#EEE7E4]" />
                  </div>
                ))}
              </div>

              {/* DESKTOP ACTIONS */}
              <div className="hidden gap-2 border-t border-[#EEE4E0] pt-5 lg:flex">
                <Skeleton className="h-[46px] flex-1 rounded-[10px] bg-[#F5ECEA]" />
                <Skeleton className="h-[46px] flex-1 rounded-[10px] bg-[#D9AAA7]" />
                <Skeleton className="h-[46px] w-[46px] shrink-0 rounded-[10px] bg-[#F2ECE9]" />
              </div>
            </section>
          </div>

          {/* QA + REVIEWS */}
          <div className="mt-2 bg-white px-3.5 sm:px-5 md:mt-6 md:rounded-[18px] md:border md:border-[#EDE3DF] md:px-6">
            {/* STORE */}
            <div className="flex items-center justify-between border-b border-[#EEE4E0] py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-[#F2E6E3]" />

                <div>
                  <Skeleton className="h-2.5 w-20 rounded-full bg-[#ECE5E2]" />
                  <Skeleton className="mt-2 h-2 w-14 rounded-full bg-[#F1EBE8]" />
                </div>
              </div>

              <Skeleton className="h-8 w-20 rounded-full bg-[#F4EEEB]" />
            </div>

            {/* QA */}
            <section className="py-5 md:py-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-[2px] w-4 rounded-full bg-[#DAB4B0]" />
                    <Skeleton className="h-1.5 w-14 rounded-full bg-[#EEE5E2]" />
                  </div>

                  <Skeleton className="mt-2 h-4 w-28 rounded-[4px] bg-[#ECE5E2]" />
                  <Skeleton className="mt-2 h-2 w-40 rounded-full bg-[#F1EBE8]" />
                </div>

                <Skeleton className="h-[34px] w-[92px] rounded-[10px] bg-[#E2C4C0]" />
              </div>

              <div className="mt-4 flex items-center gap-4 border-y border-[#F0E8E5] py-2.5">
                <Skeleton className="h-2.5 w-16 rounded-full bg-[#ECE5E2]" />
                <Skeleton className="h-3 w-px bg-[#E5DBD7]" />
                <Skeleton className="h-2.5 w-20 rounded-full bg-[#ECE5E2]" />
                <Skeleton className="h-3 w-px bg-[#E5DBD7]" />
                <Skeleton className="h-2.5 w-16 rounded-full bg-[#ECE5E2]" />
              </div>

              <div className="mt-3 overflow-hidden rounded-[14px] border border-[#EAE0DC]">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className={`flex items-start gap-2.5 px-3 py-3.5 ${index !== 2 ? "border-b border-[#F0E8E5]" : ""}`}>
                    <Skeleton className="h-7 w-7 shrink-0 rounded-full bg-[#F1E6E3]" />

                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-2.5 w-[85%] rounded-full bg-[#ECE5E2]" />
                      <Skeleton className="mt-2 h-2 w-[52%] rounded-full bg-[#F1EBE8]" />
                    </div>

                    <Skeleton className="h-3.5 w-3.5 rounded-[3px] bg-[#EEE7E4]" />
                  </div>
                ))}
              </div>
            </section>

            {/* REVIEWS */}
            <section className="border-t border-[#EEE4E0] py-5 md:py-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-[2px] w-4 rounded-full bg-[#DAB4B0]" />
                    <Skeleton className="h-1.5 w-12 rounded-full bg-[#EEE5E2]" />
                  </div>

                  <Skeleton className="mt-2 h-4 w-24 rounded-[4px] bg-[#ECE5E2]" />
                  <Skeleton className="mt-2 h-2 w-32 rounded-full bg-[#F1EBE8]" />
                </div>

                <Skeleton className="h-[34px] w-[88px] rounded-[10px] bg-[#E2C4C0]" />
              </div>

              <div className="mt-4 grid grid-cols-[92px_1fr] gap-3 border-y border-[#EEE4E0] py-4">
                <div className="flex flex-col items-center justify-center border-l border-[#EEE4E0] pl-3">
                  <Skeleton className="h-7 w-12 rounded-[5px] bg-[#ECE5E2]" />

                  <div className="mt-2 flex gap-[2px]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-3 w-3 rounded-[2px] bg-[#E8D49E]" />
                    ))}
                  </div>

                  <Skeleton className="mt-2 h-1.5 w-12 rounded-full bg-[#F0EAE7]" />
                </div>

                <div className="flex flex-col justify-center gap-[6px]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="grid grid-cols-[16px_1fr_18px] items-center gap-2">
                      <Skeleton className="h-2 w-3 rounded-full bg-[#ECE5E2]" />
                      <Skeleton className="h-1 w-full rounded-full bg-[#EEE9E6]" />
                      <Skeleton className="h-1.5 w-3 rounded-full bg-[#EEE7E4]" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className={index !== 1 ? "border-b border-[#F0E8E5] pb-4" : ""}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="h-8 w-8 rounded-full bg-[#F1E6E3]" />

                        <div>
                          <Skeleton className="h-2.5 w-20 rounded-full bg-[#ECE5E2]" />
                          <Skeleton className="mt-2 h-1.5 w-12 rounded-full bg-[#F0EAE7]" />
                        </div>
                      </div>

                      <div className="flex gap-[2px]">
                        {Array.from({ length: 5 }).map((_, starIndex) => (
                          <Skeleton key={starIndex} className="h-2.5 w-2.5 rounded-[2px] bg-[#E8D49E]" />
                        ))}
                      </div>
                    </div>

                    <Skeleton className="mr-[42px] mt-3 h-2.5 w-[75%] rounded-full bg-[#ECE5E2]" />
                    <Skeleton className="mr-[42px] mt-2 h-2.5 w-[52%] rounded-full bg-[#F0EAE7]" />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* MOBILE BUY BAR */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#EDE3DF] bg-white px-2.5 pt-2 shadow-[0_-5px_18px_rgba(50,35,30,0.04)] lg:hidden" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
        <div className="flex h-[49px] gap-2">
          <Skeleton className="h-full w-[46px] shrink-0 rounded-[10px] bg-[#F2ECE9]" />
          <Skeleton className="h-full flex-1 rounded-[10px] bg-[#F5ECEA]" />
          <Skeleton className="h-full flex-1 rounded-[10px] bg-[#D9AAA7]" />
        </div>
      </div>
    </div>
  );
};

export default ProductDetailSkeleton;