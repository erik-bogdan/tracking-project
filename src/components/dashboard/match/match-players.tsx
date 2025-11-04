"use client";

import { Users } from "lucide-react";
import { Match } from "@/types/match";

interface MatchPlayersProps {
  match: Match;
  className?: string;
}

export function MatchPlayers({ match, className }: MatchPlayersProps) {
  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Team 1 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Users className="h-4 w-4 text-white/40 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            {match.players.team1.map((player, idx) => (
              <span key={idx} className="text-sm text-white/90 truncate">
                {player}
              </span>
            ))}
          </div>
        </div>
        {match.score !== undefined && (
          <div className="text-lg font-bold text-white shrink-0 ml-2">
            {match.score.team1}
          </div>
        )}
      </div>

      {/* VS Divider */}
      <div className="flex items-center justify-center text-white/30 py-1">
        <span className="text-xs">VS</span>
      </div>

      {/* Team 2 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Users className="h-4 w-4 text-white/40 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            {match.players.team2.map((player, idx) => (
              <span key={idx} className="text-sm text-white/90 truncate">
                {player}
              </span>
            ))}
          </div>
        </div>
        {match.score !== undefined && (
          <div className="text-lg font-bold text-white shrink-0 ml-2">
            {match.score.team2}
          </div>
        )}
      </div>
    </div>
  );
}

