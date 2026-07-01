import React, { createContext, useContext, useState } from "react";

type DateRange = { start: string; end: string };

const now = new Date();
const defaultEnd = now.toISOString().slice(0, 10);
const defaultStart = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30)
  .toISOString()
  .slice(0, 10);

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
  return (
    <div className="flex gap-2 items-center">
      <input
        type="date"
        value={range.start}
        onChange={(e) => setRange({ ...range, start: e.target.value })}
        className="input"
      />
      <span>—</span>
      <input
        type="date"
        value={range.end}
        onChange={(e) => setRange({ ...range, end: e.target.value })}
        className="input"
      />
    </div>
  );
};
