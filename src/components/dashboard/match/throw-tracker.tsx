"use client";

import { ThrowRecord, MatchType } from "@/types/match";
import { ThrowTracker2v2 } from "./throw-tracker-2v2";
import { ThrowTracker1v1 } from "./throw-tracker-1v1";

interface ThrowTrackerProps {
  throws?: ThrowRecord[];
  homePlayers: string[];
  awayPlayers: string[];
  matchType: MatchType;
  matchId?: string;
  bestOf?: number; // Best Of number (e.g., 7 for BO7)
  matchStatus?: 'not_started' | 'live' | 'finished';
  initialGameState?: any; // Initial game state from DB (for finished matches)
  onStateChange?: (state: any) => void;
  className?: string;
}

interface Player {
  id: string;
  label: string;
}

// Convert string arrays to Player objects
function convertToPlayers(players: string[]): Player[] {
  return players.map((name, index) => ({
    id: `player-${index}`,
    label: name
  }));
}

export function ThrowTracker({ 
  throws, 
  homePlayers, 
  awayPlayers, 
  matchType, 
  matchId, 
  bestOf,
  matchStatus,
  initialGameState,
  onStateChange, 
  className 
}: ThrowTrackerProps) {
  // Convert string arrays to Player objects
  const homePlayersObj = convertToPlayers(homePlayers);
  const awayPlayersObj = convertToPlayers(awayPlayers);

  if (matchType === '1on1') {
    // 1v1 mode
    return (
      <ThrowTracker1v1
        homePlayer={homePlayersObj[0] || { id: 'home', label: 'Home Player' }}
        awayPlayer={awayPlayersObj[0] || { id: 'away', label: 'Away Player' }}
        matchId={matchId}
        bestOf={bestOf}
        matchStatus={matchStatus}
        initialGameState={initialGameState}
        onStateChange={onStateChange}
        className={className}
      />
    );
  } else {
    // 2v2 mode
    return (
      <ThrowTracker2v2
        homePlayers={homePlayersObj}
        awayPlayers={awayPlayersObj}
        matchId={matchId}
        bestOf={bestOf}
        matchStatus={matchStatus}
        initialGameState={initialGameState}
        onStateChange={onStateChange}
        className={className}
      />
    );
  }
}

