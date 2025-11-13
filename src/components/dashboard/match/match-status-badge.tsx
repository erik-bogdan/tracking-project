"use client";

import { Badge } from "@/components/ui/badge";
import { MatchStatus } from "@/types/match";
import { cn } from "@/lib/utils";

interface MatchStatusBadgeProps {
  status: MatchStatus;
  className?: string;
}

const statusConfig: Record<MatchStatus, { label: string; className: string }> = {
  not_started: {
    label: "Not started yet",
    className: "bg-white/10 text-white/70 border-white/20",
  },
  live: {
    label: "Live",
    className: "bg-[#ff073a] text-white border-[#ff073a] shadow-lg shadow-[#ff073a]/50",
  },
  finished: {
    label: "Finished",
    className: "bg-white/5 text-white/50 border-white/10",
  },
};

export function MatchStatusBadge({ status, className }: MatchStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge className={cn("border text-xs font-medium", config.className, className)}>
      {config.label}
    </Badge>
  );
}









