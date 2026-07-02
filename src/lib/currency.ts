import { useStore } from "@/store/useStore";

// Base prices are in SAR. YER_SOUTH: 1 SAR = 410 YER, YER_NORTH: 1 SAR = 140 YER
export const CURRENCY_RATES = {
  SAR: { rate: 1, symbol: "ر.س", label: "ريال سعودي", short: "SAR" },
  YER_SOUTH: { rate: 410, symbol: "ر.ي", label: "ريال يمني — جنوبي", short: "YER (S)" },
  YER_NORTH: { rate: 140, symbol: "ر.ي", label: "ريال يمني — شمالي", short: "YER (N)" },
} as const;

export type CurrencyMode = keyof typeof CURRENCY_RATES;

export const convertPrice = (baseSAR: number, mode: CurrencyMode): number => {
  const rate = CURRENCY_RATES[mode]?.rate ?? 1;
  const value = Number(baseSAR || 0) * rate;
  if (mode === "SAR") return Math.round(value * 100) / 100;
  return Math.round(value);
};

export const formatPrice = (baseSAR: number, mode: CurrencyMode): string => {
  const val = convertPrice(baseSAR, mode);
  const { symbol } = CURRENCY_RATES[mode];
  return `${val.toLocaleString("en-US")} ${symbol}`;
};

export const useCurrency = () => {
  const mode = useStore((s) => s.currencyMode);
  const setMode = useStore((s) => s.setCurrencyMode);
  const meta = CURRENCY_RATES[mode];
  return {
    mode,
    setMode,
    symbol: meta.symbol,
    label: meta.label,
    short: meta.short,
    format: (base: number) => formatPrice(base, mode),
    convert: (base: number) => convertPrice(base, mode),
  };
};