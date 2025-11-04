"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchMatch, startMatch } from "@/lib/slices/matchSlice";
import { DatabaseMatch, PlayerTrackingData, TrackingData, ThrowRecord } from "@/types/match";
import { toast } from "sonner";
import { ThrowTracker } from "@/components/dashboard/match/throw-tracker";

// Generate mock throws for testing
function generateMockThrows(match: DatabaseMatch): ThrowRecord[] {
  const throws: ThrowRecord[] = [];
  const playerNames = getPlayerNamesFromMatch(match);
  
  // Generate 15-20 throws alternating between teams
  const totalThrows = 18;
  let timestamp = new Date(Date.now() - totalThrows * 30000); // 30 seconds apart
  
  for (let i = 0; i < totalThrows; i++) {
    const isHome = i % 2 === 0;
    const players = isHome ? playerNames.home : playerNames.away;
    const playerName = players[Math.floor(Math.random() * players.length)] || (isHome ? 'Home Player' : 'Away Player');
    
    // 70% success rate for home, 65% for away (just for variety)
    const made = Math.random() < (isHome ? 0.7 : 0.65);
    
    throws.push({
      id: crypto.randomUUID(),
      timestamp: timestamp.toISOString(),
      team: isHome ? 'home' : 'away',
      playerName,
      made,
    });
    
    timestamp = new Date(timestamp.getTime() + 30000); // 30 seconds later
  }
  
  return throws;
}

function getPlayerNamesFromMatch(match: DatabaseMatch) {
  if (match.type === '1on1') {
    return {
      home: match.homePlayerName ? [match.homePlayerName] : ['Home Player'],
      away: match.awayPlayerName ? [match.awayPlayerName] : ['Away Player'],
    };
  } else {
    const homePlayers = [
      match.homePlayer1Name,
      match.homePlayer2Name,
    ].filter(Boolean) as string[];
    const awayPlayers = [
      match.awayPlayer1Name,
      match.awayPlayer2Name,
    ].filter(Boolean) as string[];
    return {
      home: homePlayers.length > 0 ? homePlayers : ['Home Player 1', 'Home Player 2'],
      away: awayPlayers.length > 0 ? awayPlayers : ['Away Player 1', 'Away Player 2'],
    };
  }
}

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const matchId = params.matchId as string;
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.match);
  const [match, setMatch] = useState<DatabaseMatch | null>(null);

  useEffect(() => {
    if (matchId) {
      dispatch(fetchMatch(matchId)).then((result) => {
        if (fetchMatch.fulfilled.match(result)) {
          setMatch(result.payload);
        }
      });
    }
  }, [dispatch, matchId]);

  // Also update match when it changes in Redux store
  const matchFromStore = useAppSelector((state) => 
    state.match.matches.find(m => m.id === matchId)
  );

  useEffect(() => {
    if (matchFromStore) {
      setMatch(matchFromStore);
    }
  }, [matchFromStore]);

  const handleStartMatch = async () => {
    if (!match || match.status !== 'not_started') {
      console.log('Cannot start match:', { match, status: match?.status });
      return;
    }

    console.log('Starting match:', matchId);
    try {
      const result = await dispatch(startMatch(matchId));
      console.log('Start match result:', result);
      
      if (startMatch.fulfilled.match(result)) {
        console.log('Match started successfully:', result.payload);
        setMatch(result.payload);
        toast.success("Match started!", {
          description: "The match is now live.",
        });
      } else if (startMatch.rejected.match(result)) {
        console.error('Match start failed:', result);
        toast.error("Failed to start match", {
          description: result.payload as string || "An error occurred while starting the match.",
        });
      }
    } catch (error) {
      console.error('Error in handleStartMatch:', error);
      toast.error("Failed to start match", {
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    }
  };

  // Get player names based on match type
  const getPlayerNames = () => {
    if (!match) return { home: [], away: [] };

    if (match.type === '1on1') {
      return {
        home: match.homePlayerName ? [match.homePlayerName] : [],
        away: match.awayPlayerName ? [match.awayPlayerName] : [],
      };
    } else {
      // 2v2
      const homePlayers = [match.homePlayer1Name, match.homePlayer2Name].filter(Boolean) as string[];
      const awayPlayers = [match.awayPlayer1Name, match.awayPlayer2Name].filter(Boolean) as string[];
      return {
        home: homePlayers,
        away: awayPlayers,
      };
    }
  };

  // Get team names for 2v2
  const getTeamNames = () => {
    if (!match || match.type === '1on1') {
      return { home: null, away: null };
    }
    return {
      home: match.homeTeamName,
      away: match.awayTeamName,
    };
  };

  // Get tracking data for a player
  const getPlayerTracking = (playerName: string, isHome: boolean): PlayerTrackingData => {
    if (!match?.trackingData) {
      return {
        playerName,
        made: 0,
        attempted: 0,
        percentage: 0,
      };
    }

    // Handle both object and array formats
    const trackingData = match.trackingData as any;
    const teamData = isHome ? trackingData.home : trackingData.away;
    
    if (!teamData || !Array.isArray(teamData)) {
      return {
        playerName,
        made: 0,
        attempted: 0,
        percentage: 0,
      };
    }

    const playerData = teamData.find((p: any) => p.playerName === playerName);

    if (playerData) {
      // Calculate percentage if not provided
      const percentage = playerData.attempted > 0 
        ? Math.round((playerData.made / playerData.attempted) * 100)
        : 0;
      return {
        playerName: playerData.playerName || playerName,
        made: playerData.made || 0,
        attempted: playerData.attempted || 0,
        percentage,
      };
    }

    return {
      playerName,
      made: 0,
      attempted: 0,
      percentage: 0,
    };
  };

  if (isLoading || !match) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff073a]" />
      </div>
    );
  }

  const playerNames = getPlayerNames();
  const teamNames = getTeamNames();
  const canStartMatch = match.status === 'not_started';

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-4 mb-4">
          <Link href={`/dashboard/events/${eventId}`}>
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-[#ff073a]/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-white">Match Details</h1>
        </div>
      </motion.div>

      {/* Header Section - Home vs Away */}
      <Card className="bg-[#0a0a0a] border-[#ff073a]/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white text-center">
            {teamNames.home || 'Home Team'} vs {teamNames.away || 'Away Team'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Teams side by side */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Home Team */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white text-center">
                {teamNames.home || 'Home Team'}
              </h3>
              <div className="space-y-2">
                {playerNames.home.map((playerName) => {
                  const tracking = getPlayerTracking(playerName, true);
                  return (
                    <div key={playerName} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white font-medium">{playerName}</span>
                      <span className="text-white/70 text-sm">
                        {tracking.made}/{tracking.attempted} ({tracking.percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* VS Divider - vertical for desktop */}
            <div className="hidden md:flex items-center justify-center">
              <span className="text-2xl font-bold text-[#ff073a]">VS</span>
            </div>

            {/* VS Divider - horizontal for mobile */}
            <div className="md:hidden flex items-center justify-center py-2 -order-1">
              <div className="flex-1 border-t border-white/20"></div>
              <span className="px-4 text-xl font-bold text-[#ff073a]">VS</span>
              <div className="flex-1 border-t border-white/20"></div>
            </div>

            {/* Away Team */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white text-center">
                {teamNames.away || 'Away Team'}
              </h3>
              <div className="space-y-2">
                {playerNames.away.map((playerName) => {
                  const tracking = getPlayerTracking(playerName, false);
                  return (
                    <div key={playerName} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white font-medium">{playerName}</span>
                      <span className="text-white/70 text-sm">
                        {tracking.made}/{tracking.attempted} ({tracking.percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Start Match Button - only show if not_started */}
          {canStartMatch && (
            <div className="pt-4 border-t border-white/20">
              <Button
                onClick={handleStartMatch}
                className="w-full bg-gradient-to-r from-[#ff073a] to-[#ff1744] text-white hover:from-[#ff1744] hover:to-[#ff4569]"
              >
                <Play className="h-4 w-4 mr-2" />
                Start the match
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Throw Tracker - show if match is live or finished */}
      {match.status !== 'not_started' && (
        <ThrowTracker
          throws={
            (match.trackingData && (match.trackingData as any).throws) 
              ? (match.trackingData as any).throws as ThrowRecord[]
              : generateMockThrows(match) // Use mock data for demo
          }
          homePlayers={playerNames.home}
          awayPlayers={playerNames.away}
        />
      )}

      {error && (
        <div className="p-4 bg-[#ff073a]/20 border border-[#ff073a]/30 rounded-lg">
          <p className="text-sm text-[#ff4569]">{error}</p>
        </div>
      )}
    </div>
  );
}

