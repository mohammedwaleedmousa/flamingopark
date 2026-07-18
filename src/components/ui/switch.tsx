import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={cn(
      "relative inline-flex h-7 w-[65px] shrink-0 cursor-pointer items-center rounded-full",
      "border-2 border-white/70 bg-red-500 shadow-inner",
      "transition-colors duration-300",
      "data-[state=checked]:bg-green-500",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      className
    )}
    {...props}
  >

    <SwitchPrimitives.Thumb
      className={cn(
        "block h-9 w-9 rounded-full",
        "absolute -left-2",
        "border bg-white shadow-lg",
        "transition-transform duration-300 ease-in-out",
        "data-[state=checked]:translate-x-[38px]",
      )}
    />

  </SwitchPrimitives.Root>
));

Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };