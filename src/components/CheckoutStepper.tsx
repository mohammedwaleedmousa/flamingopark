import { Check } from "lucide-react";

interface Step {
  label: string;
  done: boolean;
  active?: boolean;
}

const CheckoutStepper = ({ steps }: { steps: Step[] }) => (
  <div className="w-full max-w-3xl mx-auto mb-10" dir="rtl">
    <div className="relative flex items-center justify-between">
      {/* progress line */}
      <div className="absolute top-4 inset-x-0 h-px bg-border" />
      <div
        className="absolute top-4 right-0 h-px bg-foreground transition-all duration-500"
        style={{
          width: `${
            (steps.filter((s) => s.done).length / Math.max(1, steps.length - 1)) *
            100
          }%`,
        }}
      />

      {steps.map((s, i) => (
        <div key={i} className="relative flex flex-col items-center gap-2 z-10">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
              s.done
                ? "bg-foreground text-background"
                : s.active
                ? "bg-background text-foreground border-2 border-foreground scale-110"
                : "bg-background text-muted-foreground border border-border"
            }`}
          >
            {s.done ? <Check className="w-4 h-4" /> : i + 1}
          </div>
          <span
            className={`text-[10px] md:text-xs tracking-[0.2em] uppercase transition-colors ${
              s.active || s.done ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default CheckoutStepper;