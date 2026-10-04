"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function DeltaBadge({
  deltaPct,
  betterWhenDown = false,
  label = "vs período anterior",
  className,
}: {
  deltaPct: number | null;
  betterWhenDown?: boolean;
  label?: string;
  className?: string;
}) {
  if (deltaPct === null) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
        <Minus className="h-3 w-3" /> sin base
      </span>
    );
  }

  const isFlat = Math.abs(deltaPct) < 0.05;
  const isUp = deltaPct > 0;
  const isGood = isFlat ? null : betterWhenDown ? !isUp : isUp;
  const Icon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        isFlat ? "text-muted-foreground" : isGood ? "text-emerald-600" : "text-red-600",
        className,
      )}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
      {isFlat ? "0%" : `${deltaPct > 0 ? "+" : ""}${deltaPct}%`}
    </span>
  );
}
