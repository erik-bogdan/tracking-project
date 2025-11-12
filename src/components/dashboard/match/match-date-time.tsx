"use client";

import { Clock } from "lucide-react";

interface MatchDateTimeProps {
  date: string;
  time: string;
  className?: string;
}

export function MatchDateTime({ date, time, className }: MatchDateTimeProps) {
  return (
    <div className={`flex items-center gap-2 text-sm text-white/60 ${className}`}>
      <Clock className="h-4 w-4 shrink-0" />
      <span>
        {new Date(date).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
        {" • "}
        {time}
      </span>
    </div>
  );
}








