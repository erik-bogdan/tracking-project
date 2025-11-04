"use client";

import { Trophy } from "lucide-react";
import { Match } from "@/types/match";

interface MatchWinnerProps {
  match: Match;
  className?: string;
}

export function MatchWinner({ match, className }: MatchWinnerProps) {
  if (match.status !== "finished" || !match.score) {
    return null;
  }

  const team1Wins = match.score.team1 > match.score.team2;
  const team2Wins = match.score.team2 > match.score.team1;
  const isDraw = match.score.team1 === match.score.team2;

  if (isDraw) {
    return (
      <div className={`flex items-center justify-center gap-2 pt-2 border-t border-white/10 ${className}`}>
        <Trophy className="h-4 w-4 text-[#ff4569]" />
        <span className="text-sm font-medium text-[#ff4569]">Draw</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center gap-2 pt-2 border-t border-white/10 ${className}`}>
      <Trophy className="h-4 w-4 text-[#ff4569]" />
      <span className="text-sm font-medium text-[#ff4569]">
        {team1Wins ? "Team 1 Wins" : "Team 2 Wins"}
      </span>
    </div>
  );
}


