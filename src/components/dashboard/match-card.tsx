"use client";

import { motion } from "framer-motion";
import { Match } from "@/types/match";
import { MatchTypeBadge } from "./match/match-type-badge";
import { MatchStatusBadge } from "./match/match-status-badge";
import { MatchDateTime } from "./match/match-date-time";
import { MatchPlayers } from "./match/match-players";
import { MatchWinner } from "./match/match-winner";
import { cn } from "@/lib/utils";
import { Users, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface MatchCardProps {
  match: Match;
  eventId?: string; // Make eventId optional for backward compatibility
  className?: string;
}

export function MatchCard({ match, eventId, className }: MatchCardProps) {
  const isLive = match.status === "live";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <div
        className={cn(
          "bg-[#1a1a1a] border border-[#ff073a]/20 rounded-lg p-4 transition-all hover:border-[#ff073a]/40 hover:shadow-lg hover:shadow-[#ff073a]/10",
          isLive && "border-[#ff073a]/50 shadow-lg shadow-[#ff073a]/20"
        )}
      >
        {/* Header with badges */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <MatchTypeBadge type={match.type} />
          <MatchStatusBadge status={match.status} />
        </div>

        {/* Date and Time */}
        <div className="mb-4">
          <MatchDateTime date={match.date} time={match.time} />
        </div>

        {/* Teams */}
        <div className="space-y-3">
          {/* Team 1 */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <Users className="h-4 w-4 text-[#ff073a]/60 shrink-0 mt-1" />
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                {match.players.team1.map((player, idx) => (
                  <span key={idx} className="text-sm font-medium text-white truncate">
                    {player}
                  </span>
                ))}
              </div>
            </div>
            {match.score !== undefined && (
              <div className="text-xl font-bold text-[#ff073a] shrink-0 min-w-[2rem] text-right">
                {match.score.team1}
              </div>
            )}
          </div>

          {/* VS Divider */}
          <div className="flex items-center justify-center py-2">
            <div className="flex-1 border-t border-white/10"></div>
            <span className="px-3 text-xs font-medium text-white/40">VS</span>
            <div className="flex-1 border-t border-white/10"></div>
          </div>

          {/* Team 2 */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <Users className="h-4 w-4 text-[#ff073a]/60 shrink-0 mt-1" />
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                {match.players.team2.map((player, idx) => (
                  <span key={idx} className="text-sm font-medium text-white truncate">
                    {player}
                  </span>
                ))}
              </div>
            </div>
            {match.score !== undefined && (
              <div className="text-xl font-bold text-[#ff073a] shrink-0 min-w-[2rem] text-right">
                {match.score.team2}
              </div>
            )}
          </div>
        </div>

        {/* Winner */}
        {match.status === "finished" && match.score && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <MatchWinner match={match} />
          </div>
        )}

        {/* Open Match Button - only show if eventId is provided */}
        {eventId && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <Link href={`/dashboard/events/${eventId}/matches/${match.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-white/5 border-[#ff073a]/30 text-white hover:bg-[#ff073a]/10"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open match
              </Button>
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}
