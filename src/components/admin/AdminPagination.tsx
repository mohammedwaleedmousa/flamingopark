import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

type PageItem = number | "dots-start" | "dots-end";

export const AdminPagination = ({ page, pageSize, total, onPageChange, className }: AdminPaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const getVisiblePages = (): PageItem[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "dots-end", totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, "dots-start", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, "dots-start", currentPage - 1, currentPage, currentPage + 1, "dots-end", totalPages];
  };

  const visiblePages = getVisiblePages();

  const changePage = (nextPage: number) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);

    if (safePage === currentPage) return;

    onPageChange(safePage);
  };

  return (
    <div className={cn("flex w-full flex-col gap-3 border-t border-[#ECEFF3] bg-white px-1 py-4 sm:flex-row sm:items-center sm:justify-between", className)} dir="rtl">
      {/* RESULTS */}

      <div className="flex items-center justify-center gap-2 sm:justify-start">
        <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-[#7163C1]" />

        <p className="text-[10px] font-medium text-[#8A919B]">
          عرض
          <span className="mx-1 font-semibold tabular-nums text-[#353B45]">{from.toLocaleString("ar-EG")}</span>
          إلى
          <span className="mx-1 font-semibold tabular-nums text-[#353B45]">{to.toLocaleString("ar-EG")}</span>
          من
          <span className="mr-1 font-semibold tabular-nums text-[#353B45]">{total.toLocaleString("ar-EG")}</span>
        </p>
      </div>

      {/* PAGINATION */}

      <div className="flex items-center justify-center gap-[5px]">
        {/* FIRST */}

        <PaginationButton disabled={!canPrev} onClick={() => changePage(1)} ariaLabel="الصفحة الأولى">
          <ChevronsRight className="h-[13px] w-[13px]" strokeWidth={1.8} />
        </PaginationButton>

        {/* PREVIOUS */}

        <PaginationButton disabled={!canPrev} onClick={() => changePage(currentPage - 1)} ariaLabel="الصفحة السابقة">
          <ChevronRight className="h-[13px] w-[13px]" strokeWidth={1.8} />
        </PaginationButton>

        {/* PAGE NUMBERS */}

        <div className="hidden items-center gap-[4px] xs:flex sm:flex">
          {visiblePages.map((item, index) => {
            if (item === "dots-start" || item === "dots-end") {
              return (
                <span key={`${item}-${index}`} className="flex h-[32px] w-[22px] items-center justify-center text-[11px] font-medium text-[#A4AAB3]">
                  …
                </span>
              );
            }

            const active = item === currentPage;

            return (
              <button key={item} type="button" onClick={() => changePage(item)} aria-current={active ? "page" : undefined} className={cn("flex h-[32px] min-w-[32px] items-center justify-center rounded-[9px] border px-[7px] text-[10px] font-semibold tabular-nums transition-colors duration-150", active ? "border-[#E3DFF7] bg-[#F3F0FF] text-[#6257B7]" : "border-transparent bg-transparent text-[#7E858F] hover:border-[#E9ECF0] hover:bg-[#F8FAFC] hover:text-[#3E4550]")}>
                {item.toLocaleString("ar-EG")}
              </button>
            );
          })}
        </div>

        {/* MOBILE CURRENT */}

        <div className="flex h-[32px] min-w-[76px] items-center justify-center rounded-[9px] border border-[#E7EAF0] bg-[#F9FAFC] px-3 sm:hidden">
          <span className="text-[10px] font-semibold tabular-nums text-[#4B525D]">{currentPage.toLocaleString("ar-EG")}</span>
          <span className="mx-[5px] text-[8px] text-[#B0B5BD]">/</span>
          <span className="text-[9px] font-medium tabular-nums text-[#9097A1]">{totalPages.toLocaleString("ar-EG")}</span>
        </div>

        {/* NEXT */}

        <PaginationButton disabled={!canNext} onClick={() => changePage(currentPage + 1)} ariaLabel="الصفحة التالية">
          <ChevronLeft className="h-[13px] w-[13px]" strokeWidth={1.8} />
        </PaginationButton>

        {/* LAST */}

        <PaginationButton disabled={!canNext} onClick={() => changePage(totalPages)} ariaLabel="الصفحة الأخيرة">
          <ChevronsLeft className="h-[13px] w-[13px]" strokeWidth={1.8} />
        </PaginationButton>
      </div>
    </div>
  );
};

const PaginationButton = ({ children, disabled, onClick, ariaLabel }: { children: React.ReactNode; disabled: boolean; onClick: () => void; ariaLabel: string }) => {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-label={ariaLabel} className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[9px] border border-[#E7EAF0] bg-white text-[#6E7580] transition-colors duration-150 hover:border-[#D9DEE5] hover:bg-[#F8FAFC] hover:text-[#444B55] disabled:cursor-not-allowed disabled:border-[#EEF0F3] disabled:bg-[#FAFBFC] disabled:text-[#C4C8CE]">
      {children}
    </button>
  );
};

export default AdminPagination;