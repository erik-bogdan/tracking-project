"use client";

import { Badge } from "@/components/ui/badge";
import { MatchType } from "@/types/match";
import { cn } from "@/lib/utils";

interface MatchTypeBadgeProps {
  type: MatchType;
  className?: string;
}

export function MatchTypeBadge({ type, className }: MatchTypeBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border text-xs font-medium",
        type === "1on1"
          ? "bg-[#ff1744]/20 text-[#ff4569] border-[#ff1744]/30"
          : "bg-[#ff073a]/20 text-[#ff073a] border-[#ff073a]/30",
        className
      )}
    >
      {type === "1on1" ? "1v1" : "2v2"}
    </Badge>
  );
}









