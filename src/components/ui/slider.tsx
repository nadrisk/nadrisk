import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

/** Scope that keeps reset defaults apart for sliders sharing a label (e.g. per pad). */
export const ResetScope = React.createContext("");
// First value each slider shows after page load = its factory default, used by double-click reset.
const firstSeen = new Map<string, number[]>();

type Props = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { resetValue?: number[] };

const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, Props>(({ className, "aria-label": ariaLabel, resetValue, onPointerDown, ...props }, ref) => {
  const scope = React.useContext(ResetScope), key = `${scope}|${ariaLabel ?? ""}`;
  if (props.value && !firstSeen.has(key)) firstSeen.set(key, [...props.value]);
  const last = React.useRef(0);
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      onPointerDown={e => {
        onPointerDown?.(e);
        // Double-click / double-tap snaps back to default. Synthetic (MIDI-driven) events never reset.
        if (!e.isTrusted || props.disabled) return;
        const target = resetValue ?? firstSeen.get(key);
        if (target && e.timeStamp - last.current < 320) { e.preventDefault(); last.current = 0; props.onValueChange?.(target); props.onValueCommit?.(target); return; }
        last.current = e.timeStamp;
      }}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb aria-label={ariaLabel} className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
