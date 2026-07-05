import React, { createContext, useContext, useMemo, useState } from "react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ar } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DateRange = { start: string; end: string };

function toLocalDateInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

const now = new Date();
const defaultEnd = toLocalDateInputValue(now);
const defaultStart = toLocalDateInputValue(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30));

const DateRangeContext = createContext<{
  range: DateRange;
  setRange: (r: DateRange) => void;
}>({ range: { start: defaultStart, end: defaultEnd }, setRange: () => {} });

export const DateRangeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [range, setRange] = useState<DateRange>({ start: defaultStart, end: defaultEnd });
  return <DateRangeContext.Provider value={{ range, setRange }}>{children}</DateRangeContext.Provider>;
};

export function useDateRange() {
  return useContext(DateRangeContext);
}

export const DateRangePicker: React.FC = () => {
  const { range, setRange } = useDateRange();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(range);

  const label = useMemo(() => {
    try {
      const start = format(new Date(range.start), "dd MMM", { locale: ar });
      const end = format(new Date(range.end), "dd MMM yyyy", { locale: ar });
      return `${start} - ${end}`;
    } catch {
      return "اختر الفترة";
    }
  }, [range.start, range.end]);

  const applyDraft = () => {
    const start = draft.start || range.start;
    const end = draft.end || range.end;
    if (new Date(start) > new Date(end)) {
      setRange({ start: end, end: start });
    } else {
      setRange({ start, end });
    }
    setOpen(false);
  };

  const setPresetDays = (days: number) => {
    const now = new Date();
    const end = toLocalDateInputValue(now);
    const start = toLocalDateInputValue(subDays(now, days - 1));
    setDraft({ start, end });
  };

  const setMonthPreset = () => {
    const now = new Date();
    setDraft({
      start: toLocalDateInputValue(startOfMonth(now)),
      end: toLocalDateInputValue(endOfMonth(now)),
    });
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(range);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-xl border-pink-200 bg-white/90 px-2.5 text-[11px] text-pink-700 hover:bg-pink-50"
        >
          <CalendarDays className="w-3.5 h-3.5" />
          {label}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[320px] rounded-2xl border-pink-200 bg-white/95 p-3 shadow-xl">
        <div className="space-y-3" dir="rtl">
          <p className="text-xs font-medium text-pink-700">فلتر التاريخ</p>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => setPresetDays(7)}>
              آخر 7 أيام
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => setPresetDays(30)}>
              آخر 30 يوم
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => setPresetDays(90)}>
              آخر 90 يوم
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={setMonthPreset}>
              هذا الشهر
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground">من</label>
              <input
                type="date"
                value={draft.start}
                onChange={(e) => setDraft((prev) => ({ ...prev, start: e.target.value }))}
                className="mt-1 h-9 w-full rounded-xl border border-pink-200 bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-pink-300/60"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">إلى</label>
              <input
                type="date"
                value={draft.end}
                onChange={(e) => setDraft((prev) => ({ ...prev, end: e.target.value }))}
                className="mt-1 h-9 w-full rounded-xl border border-pink-200 bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-pink-300/60"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg px-3 text-xs" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" size="sm" className="h-8 rounded-lg px-3 text-xs" onClick={applyDraft}>
              تطبيق
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
