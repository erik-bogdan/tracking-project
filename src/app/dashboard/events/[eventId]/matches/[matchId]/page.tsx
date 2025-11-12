"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchMatch, startMatch } from "@/lib/slices/matchSlice";
import { syncTracking, finishTracking } from "@/lib/slices/matchSlice";
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

// Calculate score up to a specific throw index
function calculateScoreUpTo(throws: Array<{ team: 'home' | 'away'; made: boolean }>, upToIndex: number): { home: number; away: number } {
  let homeScore = 0;
  let awayScore = 0;
  
  for (let i = 0; i <= upToIndex && i < throws.length; i++) {
    if (throws[i].made) {
      if (throws[i].team === 'home') {
        homeScore++;
      } else {
        awayScore++;
      }
    }
  }
  
  return { home: homeScore, away: awayScore };
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
  const { isLoading: isFinishing } = useAppSelector((state) => state.match);
  const [match, setMatch] = useState<DatabaseMatch | null>(null);
  const [trackingState, setTrackingState] = useState<any>(null);
  const [lastThrowCount, setLastThrowCount] = useState(0);
  const [animations, setAnimations] = useState<Array<{ id: number; type: 'hit' | 'miss'; timestamp: number }>>([]);
  const animationIdRef = useRef(0);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Load tracking state from DB if match is finished
  useEffect(() => {
    if (match && match.status === 'finished' && match.trackingData && !trackingState) {
      // Load from DB trackingData instead of localStorage
      const dbTrackingData = match.trackingData as any;
      if (dbTrackingData.gameState) {
        setTrackingState(dbTrackingData.gameState);
      }
    }
  }, [match, trackingState]);

  // Initialize lastThrowCount when trackingState is first loaded
  useEffect(() => {
    if (trackingState?.gameHistory && lastThrowCount === 0) {
      setLastThrowCount(trackingState.gameHistory.length);
    }
  }, [trackingState?.gameHistory, lastThrowCount]);

  // Sync tracking data to backend (debounced)
  useEffect(() => {
    if (!trackingState || !matchId || match?.status !== 'live') return;
    
    // Clear existing timer
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }
    
    // Debounce sync to avoid too many requests (500ms delay)
    syncTimerRef.current = setTimeout(() => {
      const trackingPayload = {
        gameState: trackingState,
        gameHistory: trackingState.gameHistory || [],
        timestamp: Date.now()
      };
      
      dispatch(syncTracking({ matchId, trackingData: trackingPayload })).catch(err => {
        console.error('Failed to sync tracking data:', err);
      });
    }, 500);
    
    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [trackingState, matchId, match?.status, dispatch]);

  // Detect new throws and show hit/miss animation
  useEffect(() => {
    if (!trackingState?.gameHistory) return;
    
    const currentThrowCount = trackingState.gameHistory.length;
    
    // If a new throw was added
    if (currentThrowCount > lastThrowCount) {
      const lastThrow = trackingState.gameHistory[trackingState.gameHistory.length - 1];
      if (lastThrow) {
        // Create new animation
        const animationId = animationIdRef.current++;
        const newAnimation = {
          id: animationId,
          type: lastThrow.type,
          timestamp: Date.now()
        };
        
        // Add to animations array
        setAnimations(prev => [...prev, newAnimation]);
        
        // Remove after 2 seconds
        setTimeout(() => {
          setAnimations(prev => prev.filter(anim => anim.id !== animationId));
        }, 2000);
        
        setLastThrowCount(currentThrowCount);
      }
    }
  }, [trackingState?.gameHistory, lastThrowCount]);

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

  const handleFinishMatch = async () => {
    if (!match || !matchId) return;

    try {
      const trackingPayload = trackingState ? {
        gameState: trackingState,
        gameHistory: trackingState.gameHistory || [],
        timestamp: Date.now()
      } : undefined;

      const result = await dispatch(finishTracking({ matchId, trackingData: trackingPayload }));
      
      if (finishTracking.fulfilled.match(result)) {
        const updatedMatch = result.payload;
        if (updatedMatch) {
          setMatch(updatedMatch);
          toast.success("Match finished!", {
            description: "The match status has been updated to finished.",
          });
          // Refresh match from store
          dispatch(fetchMatch(matchId));
        }
      } else {
        toast.error("Failed to finish match", {
          description: result.payload as string || "An error occurred while finishing the match.",
        });
      }
    } catch (error) {
      console.error('Error finishing match:', error);
      toast.error("Failed to finish match", {
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
    // If we have live tracking state, use that (most up-to-date)
    if (trackingState?.gameHistory) {
      // Find the player index in the names array (0 or 1)
      const playerIndex = isHome 
        ? playerNames.home.findIndex(p => p === playerName)
        : playerNames.away.findIndex(p => p === playerName);
      
      // Player IDs are in format "player-0", "player-1" based on index
      // Or we can use the trackingState's player IDs directly
      let playerId: string | null = null;
      if (playerIndex === 0) {
        playerId = isHome ? trackingState.homeFirstPlayer : trackingState.awayFirstPlayer;
      } else if (playerIndex === 1) {
        playerId = isHome ? trackingState.homeSecondPlayer : trackingState.awaySecondPlayer;
      }
      
      // Fallback: if player IDs not found, use index-based format
      if (!playerId && playerIndex >= 0) {
        playerId = `player-${playerIndex}`;
      }
      
      if (playerId) {
        const playerThrows = trackingState.gameHistory.filter((action: any) => {
          return action.playerId === playerId && action.team === (isHome ? 'home' : 'away');
        });
        
        const hits = playerThrows.filter((action: any) => action.type === 'hit').length;
        const total = playerThrows.length;
        const percentage = total > 0 ? Math.round((hits / total) * 100) : 0;
        
        return {
          playerName,
          made: hits,
          attempted: total,
          percentage,
        };
      }
    }

    // Fallback to match.trackingData if available
    if (match?.trackingData) {
      const trackingData = match.trackingData as any;
      const teamData = isHome ? trackingData.home : trackingData.away;
      
      if (teamData && Array.isArray(teamData)) {
        const playerData = teamData.find((p: any) => p.playerName === playerName);

        if (playerData) {
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
      }
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
  
  // Get current throwing team from tracking state
  const currentThrowingTeam = trackingState?.currentTurn || null;
  const isHomeThrowing = currentThrowingTeam === 'home';
  const isAwayThrowing = currentThrowingTeam === 'away';

  return (
    <div className="space-y-8 relative">

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
      <Card className="bg-[#0a0a0a] border-[#ff073a]/30 backdrop-blur-sm relative overflow-hidden">
        {/* Hit/Miss Animation inside the card */}
        <AnimatePresence>
          {animations.map((animation, index) => (
            <motion.div
              key={animation.id}
              initial={{ opacity: 1, y: 200, scale: 1 }}
              animate={{ 
                opacity: 0, 
                y: -200, 
                scale: 0.3
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2,
                ease: "easeOut"
              }}
              className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              <motion.div
                className={`text-7xl md:text-8xl font-black tracking-wider ${
                  animation.type === 'hit' 
                    ? 'text-green-500 drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]' 
                    : 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]'
                }`}
                style={{
                  textShadow: animation.type === 'hit' 
                    ? '0 0 30px rgba(34, 197, 94, 0.8), 0 0 60px rgba(34, 197, 94, 0.5)' 
                    : '0 0 30px rgba(239, 68, 68, 0.8), 0 0 60px rgba(239, 68, 68, 0.5)'
                }}
              >
                {animation.type === 'hit' ? 'HIT' : 'MISS'}
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white text-center">
            {teamNames.home || 'Home Team'} vs {teamNames.away || 'Away Team'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Teams side by side */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Home Team */}
            <motion.div 
              className={`space-y-3 p-4 rounded-lg transition-all duration-300 ${
                isHomeThrowing 
                  ? 'border-2 border-[#ff073a] shadow-lg shadow-[#ff073a]/50' 
                  : 'border-2 border-transparent'
              }`}
              animate={isHomeThrowing ? {
                boxShadow: [
                  '0 0 20px rgba(255, 7, 58, 0.5)',
                  '0 0 30px rgba(255, 7, 58, 0.7)',
                  '0 0 20px rgba(255, 7, 58, 0.5)',
                ],
              } : {}}
              transition={{
                duration: 2,
                repeat: isHomeThrowing ? Infinity : 0,
                ease: "easeInOut"
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <h3 className={`text-lg font-semibold text-center ${
                  isHomeThrowing ? 'text-[#ff073a]' : 'text-white'
                }`}>
                  {teamNames.home || 'Home Team'}
                </h3>
                {isHomeThrowing && (
                  <motion.div
                    className="w-3 h-3 rounded-full bg-[#ff073a]"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>
              <div className="space-y-2">
                {playerNames.home.map((playerName) => {
                  const tracking = getPlayerTracking(playerName, true);
                  return (
                    <div 
                      key={playerName} 
                      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                        isHomeThrowing 
                          ? 'bg-white/5 border border-[#ff073a]' 
                          : 'bg-white/5'
                      }`}
                    >
                      <span className={`font-medium ${
                        isHomeThrowing ? 'text-[#ff073a]' : 'text-white'
                      }`}>
                        {playerName}
                      </span>
                      <span className={`text-sm ${
                        isHomeThrowing ? 'text-[#ff073a]/90' : 'text-white/70'
                      }`}>
                        {tracking.made}/{tracking.attempted} ({tracking.percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

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
            <motion.div 
              className={`space-y-3 p-4 rounded-lg transition-all duration-300 ${
                isAwayThrowing 
                  ? 'border-2 border-[#ff073a] shadow-lg shadow-[#ff073a]/50' 
                  : 'border-2 border-transparent'
              }`}
              animate={isAwayThrowing ? {
                boxShadow: [
                  '0 0 20px rgba(255, 7, 58, 0.5)',
                  '0 0 30px rgba(255, 7, 58, 0.7)',
                  '0 0 20px rgba(255, 7, 58, 0.5)',
                ],
              } : {}}
              transition={{
                duration: 2,
                repeat: isAwayThrowing ? Infinity : 0,
                ease: "easeInOut"
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <h3 className={`text-lg font-semibold text-center ${
                  isAwayThrowing ? 'text-[#ff073a]' : 'text-white'
                }`}>
                  {teamNames.away || 'Away Team'}
                </h3>
                {isAwayThrowing && (
                  <motion.div
                    className="w-3 h-3 rounded-full bg-[#ff073a]"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>
              <div className="space-y-2">
                {playerNames.away.map((playerName) => {
                  const tracking = getPlayerTracking(playerName, false);
                  return (
                    <div 
                      key={playerName} 
                      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                        isAwayThrowing 
                          ? 'bg-white/5 border border-[#ff073a]' 
                          : 'bg-white/5'
                      }`}
                    >
                      <span className={`font-medium ${
                        isAwayThrowing ? 'text-[#ff073a]' : 'text-white'
                      }`}>
                        {playerName}
                      </span>
                      <span className={`text-sm ${
                        isAwayThrowing ? 'text-[#ff073a]/90' : 'text-white/70'
                      }`}>
                        {tracking.made}/{tracking.attempted} ({tracking.percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
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

          {/* Finish Match Button - show if match is live and tracking shows match ended */}
          {match?.status === 'live' && trackingState?.matchEnded && (
            <div className="pt-4 border-t border-white/20">
              <Button
                onClick={handleFinishMatch}
                disabled={isFinishing}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 disabled:opacity-50"
              >
                {isFinishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Finishing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Finish Match
                  </>
                )}
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
          matchType={match.type}
          matchId={match.id}
          bestOf={match.bestOf || 1}
          matchStatus={match.status}
          initialGameState={
            match.status === 'finished' && match.trackingData && (match.trackingData as any).gameState
              ? (match.trackingData as any).gameState
              : undefined
          }
          onStateChange={(state) => {
            // Only update tracking state if match is not finished (to avoid overwriting DB data)
            if (match.status !== 'finished') {
              setTrackingState(state);
            }
          }}
        />
      )}

      {/* Match History - show all completed games with statistics */}
      {match.status !== 'not_started' && (() => {
        // Get matchHistory from trackingState or from match.trackingData
        const matchHistory = trackingState?.matchHistory || 
          (match.trackingData && (match.trackingData as any).gameState?.matchHistory) || 
          [];
        
        return matchHistory.length > 0;
      })() && (() => {
        const matchHistory = trackingState?.matchHistory || 
          (match.trackingData && (match.trackingData as any).gameState?.matchHistory) || 
          [];
        
        return (
        <Card className="bg-[#0a0a0a] border-[#ff073a]/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white text-center">
              Match History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {matchHistory
              .filter((game: any) => game.winner !== null)
              .sort((a: any, b: any) => a.gameNumber - b.gameNumber)
              .map((game: any) => {
                // Calculate statistics for this game
                const gameHistory = game.gameHistory || [];
                
                // Calculate scores
                let homeScore = 0;
                let awayScore = 0;
                
                // Calculate player statistics
                const playerStats: Record<string, { throws: number; hits: number; hitRate: number }> = {};
                
                gameHistory.forEach((action: any) => {
                  if (!action.playerId) return;
                  
                  if (!playerStats[action.playerId]) {
                    playerStats[action.playerId] = { throws: 0, hits: 0, hitRate: 0 };
                  }
                  
                  playerStats[action.playerId].throws++;
                  if (action.type === 'hit') {
                    playerStats[action.playerId].hits++;
                    if (action.team === 'home') {
                      homeScore++;
                    } else {
                      awayScore++;
                    }
                  }
                });
                
                // Calculate hit rates
                Object.keys(playerStats).forEach(playerId => {
                  const stats = playerStats[playerId];
                  stats.hitRate = stats.throws > 0 ? Math.round((stats.hits / stats.throws) * 100) : 0;
                });
                
                // For 1v1, calculate stats by team instead of by player ID
                let homePlayers: Array<{ playerId: string; stats: { throws: number; hits: number; hitRate: number } }> = [];
                let awayPlayers: Array<{ playerId: string; stats: { throws: number; hits: number; hitRate: number } }> = [];
                
                if (match.type === '1on1') {
                  // For 1v1, aggregate stats by team
                  const homeTeamStats = { throws: 0, hits: 0, hitRate: 0 };
                  const awayTeamStats = { throws: 0, hits: 0, hitRate: 0 };
                  
                  gameHistory.forEach((action: any) => {
                    if (!action.team) return;
                    if (action.team === 'home') {
                      homeTeamStats.throws++;
                      if (action.type === 'hit') {
                        homeTeamStats.hits++;
                      }
                    } else {
                      awayTeamStats.throws++;
                      if (action.type === 'hit') {
                        awayTeamStats.hits++;
                      }
                    }
                  });
                  
                  homeTeamStats.hitRate = homeTeamStats.throws > 0 
                    ? Math.round((homeTeamStats.hits / homeTeamStats.throws) * 100) 
                    : 0;
                  awayTeamStats.hitRate = awayTeamStats.throws > 0 
                    ? Math.round((awayTeamStats.hits / awayTeamStats.throws) * 100) 
                    : 0;
                  
                  // Create player entries for 1v1
                  homePlayers = [{ playerId: 'home', stats: homeTeamStats }];
                  awayPlayers = [{ playerId: 'away', stats: awayTeamStats }];
                } else {
                  // For 2v2, use gameState player IDs as the source of truth
                  // Get gameState from trackingState or match.trackingData
                  const gameState = trackingState || (match.trackingData && (match.trackingData as any).gameState) || {};
                  
                  // Get player IDs from gameState
                  const homeFirstPlayerId = gameState.homeFirstPlayer;
                  const homeSecondPlayerId = gameState.homeSecondPlayer;
                  const awayFirstPlayerId = gameState.awayFirstPlayer;
                  const awaySecondPlayerId = gameState.awaySecondPlayer;
                  
                  // Track which player IDs we've seen for each team from gameHistory
                  const homePlayerIdsSeen = new Set<string>();
                  const awayPlayerIdsSeen = new Set<string>();
                  
                  gameHistory.forEach((action: any) => {
                    if (!action.playerId || !action.team) return;
                    if (action.team === 'home') {
                      homePlayerIdsSeen.add(action.playerId);
                    } else if (action.team === 'away') {
                      awayPlayerIdsSeen.add(action.playerId);
                    }
                  });
                  
                  // Create mapping from gameHistory playerId to gameState player ID
                  const playerIdMapping: Record<string, string> = {};
                  const homePlayerIdsArray = Array.from(homePlayerIdsSeen);
                  const awayPlayerIdsArray = Array.from(awayPlayerIdsSeen);
                  
                  // Map home team player IDs
                  if (homePlayerIdsArray.length > 0 && homeFirstPlayerId) {
                    playerIdMapping[homePlayerIdsArray[0]] = homeFirstPlayerId;
                  }
                  if (homePlayerIdsArray.length > 1 && homeSecondPlayerId) {
                    playerIdMapping[homePlayerIdsArray[1]] = homeSecondPlayerId;
                  }
                  
                  // Map away team player IDs
                  if (awayPlayerIdsArray.length > 0 && awayFirstPlayerId) {
                    playerIdMapping[awayPlayerIdsArray[0]] = awayFirstPlayerId;
                  }
                  if (awayPlayerIdsArray.length > 1 && awaySecondPlayerId) {
                    playerIdMapping[awayPlayerIdsArray[1]] = awaySecondPlayerId;
                  }
                  
                  // Recalculate playerStats using mapped IDs
                  const mappedPlayerStats: Record<string, { throws: number; hits: number; hitRate: number }> = {};
                  
                  // Initialize stats for all known players
                  if (homeFirstPlayerId) {
                    mappedPlayerStats[homeFirstPlayerId] = { throws: 0, hits: 0, hitRate: 0 };
                  }
                  if (homeSecondPlayerId) {
                    mappedPlayerStats[homeSecondPlayerId] = { throws: 0, hits: 0, hitRate: 0 };
                  }
                  if (awayFirstPlayerId) {
                    mappedPlayerStats[awayFirstPlayerId] = { throws: 0, hits: 0, hitRate: 0 };
                  }
                  if (awaySecondPlayerId) {
                    mappedPlayerStats[awaySecondPlayerId] = { throws: 0, hits: 0, hitRate: 0 };
                  }
                  
                  // Map stats from gameHistory playerId to gameState player ID
                  gameHistory.forEach((action: any) => {
                    if (!action.playerId) return;
                    
                    const mappedPlayerId = playerIdMapping[action.playerId] || (
                      action.playerId === homeFirstPlayerId || action.playerId === homeSecondPlayerId ||
                      action.playerId === awayFirstPlayerId || action.playerId === awaySecondPlayerId
                        ? action.playerId
                        : null
                    );
                    
                    if (!mappedPlayerId || !mappedPlayerStats[mappedPlayerId]) return;
                    
                    mappedPlayerStats[mappedPlayerId].throws++;
                    if (action.type === 'hit') {
                      mappedPlayerStats[mappedPlayerId].hits++;
                    }
                  });
                  
                  // Calculate hit rates
                  Object.keys(mappedPlayerStats).forEach(playerId => {
                    const stats = mappedPlayerStats[playerId];
                    stats.hitRate = stats.throws > 0 ? Math.round((stats.hits / stats.throws) * 100) : 0;
                  });
                  
                  // Group players by team using mapped stats
                  if (homeFirstPlayerId && mappedPlayerStats[homeFirstPlayerId]) {
                    homePlayers.push({ playerId: homeFirstPlayerId, stats: mappedPlayerStats[homeFirstPlayerId] });
                  }
                  if (homeSecondPlayerId && mappedPlayerStats[homeSecondPlayerId]) {
                    homePlayers.push({ playerId: homeSecondPlayerId, stats: mappedPlayerStats[homeSecondPlayerId] });
                  }
                  if (awayFirstPlayerId && mappedPlayerStats[awayFirstPlayerId]) {
                    awayPlayers.push({ playerId: awayFirstPlayerId, stats: mappedPlayerStats[awayFirstPlayerId] });
                  }
                  if (awaySecondPlayerId && mappedPlayerStats[awaySecondPlayerId]) {
                    awayPlayers.push({ playerId: awaySecondPlayerId, stats: mappedPlayerStats[awaySecondPlayerId] });
                  }
                }
                
                // Get player name helper
                const getPlayerName = (playerId: string, team: 'home' | 'away', index: number) => {
                  if (match.type === '1on1') {
                    return team === 'home' 
                      ? (match.homePlayerName || 'Home Player')
                      : (match.awayPlayerName || 'Away Player');
                  } else {
                    // For 2v2, use index to determine which player
                    if (team === 'home') {
                      return index === 0 
                        ? (match.homePlayer1Name || 'Home Player 1')
                        : (match.homePlayer2Name || 'Home Player 2');
                    } else {
                      return index === 0
                        ? (match.awayPlayer1Name || 'Away Player 1')
                        : (match.awayPlayer2Name || 'Away Player 2');
                    }
                  }
                };
                
                return (
                  <motion.div
                    key={game.gameNumber}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 bg-white/5 border border-white/10 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">
                        Game {game.gameNumber}
                      </h3>
                      <div className="flex items-center gap-4">
                        <span className={`text-lg font-semibold ${
                          game.winner === 'home' ? 'text-[#ff073a]' : 'text-white/70'
                        }`}>
                          {homeScore}
                        </span>
                        <span className="text-white/50">-</span>
                        <span className={`text-lg font-semibold ${
                          game.winner === 'away' ? 'text-[#ff073a]' : 'text-white/70'
                        }`}>
                          {awayScore}
                        </span>
                        <span className="text-sm text-white/60">
                          ({game.winner === 'home' ? playerNames.home[0] : playerNames.away[0]} won)
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {/* Home Team Stats */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-white/90 mb-2">
                          {match.type === '1on1' 
                            ? (match.homePlayerName || 'Home Player')
                            : (match.homeTeamName || 'Home Team')}
                        </h4>
                        {homePlayers.length > 0 ? (
                          homePlayers.map((player, idx) => {
                            const playerName = getPlayerName(player.playerId, 'home', idx);
                            return (
                              <div key={player.playerId} className="flex items-center justify-between p-2 bg-white/5 rounded">
                                <span className="text-white/80 text-sm">{playerName}</span>
                                <span className="text-white/70 text-sm">
                                  {player.stats.hits}/{player.stats.throws} ({player.stats.hitRate}%)
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-white/60 text-sm p-2">No throws recorded</div>
                        )}
                      </div>
                      
                      {/* Away Team Stats */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-white/90 mb-2">
                          {match.type === '1on1'
                            ? (match.awayPlayerName || 'Away Player')
                            : (match.awayTeamName || 'Away Team')}
                        </h4>
                        {awayPlayers.length > 0 ? (
                          awayPlayers.map((player, idx) => {
                            const playerName = getPlayerName(player.playerId, 'away', idx);
                            return (
                              <div key={player.playerId} className="flex items-center justify-between p-2 bg-white/5 rounded">
                                <span className="text-white/80 text-sm">{playerName}</span>
                                <span className="text-white/70 text-sm">
                                  {player.stats.hits}/{player.stats.throws} ({player.stats.hitRate}%)
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-white/60 text-sm p-2">No throws recorded</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Throws Timeline */}
                    {gameHistory.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-white/90 mb-4">Throws Timeline</h4>
                        <div 
                          className="relative overflow-x-auto overflow-y-visible" 
                          style={{ 
                            minHeight: '280px', 
                            paddingBottom: '60px', 
                            paddingTop: '60px',
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#ff073a #0a0a0a'
                          }}
                        >
                          {/* Center line */}
                          <div 
                            className="absolute left-0 right-0 h-0.5 bg-white/20 z-0 pointer-events-none" 
                            style={{ 
                              top: 'calc(50% - 1px)'
                            }} 
                          />
                          
                          <div className="flex items-center gap-4 min-w-max px-4" style={{ minHeight: '280px' }}>
                            {gameHistory.map((action: any, index: number) => {
                              const isHome = action.team === 'home';
                              const isMade = action.type === 'hit';
                              
                              // Calculate score up to this point
                              const score = calculateScoreUpTo(
                                gameHistory.slice(0, index + 1).map((a: any) => ({
                                  team: a.team,
                                  made: a.type === 'hit'
                                })),
                                index
                              );
                              const scoreText = `${score.home}-${score.away}`;
                              
                              // Get player name
                              const playerName = getPlayerName(action.playerId, action.team, 
                                action.team === 'home' 
                                  ? homePlayers.findIndex(p => p.playerId === action.playerId)
                                  : awayPlayers.findIndex(p => p.playerId === action.playerId)
                              );
                              
                              return (
                                <motion.div
                                  key={`${action.playerId}-${action.timestamp}-${index}`}
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ 
                                    delay: 0,
                                    duration: 0.2,
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 25
                                  }}
                                  className="flex flex-col items-center gap-1 relative z-10"
                                  style={{
                                    marginTop: isHome ? '-120px' : '0px',
                                    marginBottom: isHome ? '0px' : '-120px',
                                  }}
                                >
                                  {isHome ? (
                                    <div className="text-center mb-1">
                                      <div className="text-white/70 text-xs leading-tight">{playerName}</div>
                                      <div className="text-white/60 text-xs">{scoreText}</div>
                                    </div>
                                  ) : null}
                                  
                                  <div
                                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center relative transition-all hover:scale-110 ${
                                      isMade 
                                        ? "bg-green-500 border-green-400 shadow-lg shadow-green-500/50" 
                                        : "bg-red-500 border-red-400 shadow-lg shadow-red-500/50"
                                    }`}
                                  >
                                    <div
                                      className={`absolute w-0 h-0 border-l-[10px] border-r-[10px] border-l-transparent border-r-transparent ${
                                        isHome 
                                          ? "top-full mt-2 border-t-[12px] border-t-white/40"
                                          : "bottom-full mb-2 border-b-[12px] border-b-white/40"
                                      }`}
                                    />
                                    <span className="text-white text-sm font-bold">
                                      {isMade ? '✓' : '✗'}
                                    </span>
                                  </div>
                                  
                                  {!isHome ? (
                                    <div className="text-center mt-1">
                                      <div className="text-white/70 text-xs leading-tight">{playerName}</div>
                                      <div className="text-white/60 text-xs">{scoreText}</div>
                                    </div>
                                  ) : null}
                                </motion.div>
                              );
                            })}
                            
                            {gameHistory.length === 0 && (
                              <div className="flex items-center justify-center w-full py-8">
                                <p className="text-white/50 text-sm">No throws recorded</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
          </CardContent>
        </Card>
        );
      })()}

      {error && (
        <div className="p-4 bg-[#ff073a]/20 border border-[#ff073a]/30 rounded-lg">
          <p className="text-sm text-[#ff4569]">{error}</p>
        </div>
      )}
    </div>
  );
}

