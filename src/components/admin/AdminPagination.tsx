import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const AdminPagination = ({ page, pageSize, total, onPageChange, className }: AdminPaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-3 py-3", className)}>
      <p className="text-xs text-muted-foreground">
        عرض <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> من{" "}
        <span className="font-medium text-foreground">{total.toLocaleString("ar-EG")}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={!canPrev} onClick={() => onPageChange(1)} aria-label="الأولى">
          <ChevronsRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={!canPrev} onClick={() => onPageChange(page - 1)} aria-label="السابق">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="px-3 text-sm font-medium tabular-nums">
          {page} / {totalPages}
        </span>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={!canNext} onClick={() => onPageChange(page + 1)} aria-label="التالي">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={!canNext} onClick={() => onPageChange(totalPages)} aria-label="الأخيرة">
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AdminPagination;