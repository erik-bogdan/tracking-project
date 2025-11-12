"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { LiveMatchLayout } from "@/components/live/live-match-layout";
import { Loader2 } from "lucide-react";

interface Event {
  id: string;
  name: string;
  type: '1on1' | '2on2';
  date: string;
  location?: string;
  showTwitchChat: boolean;
  layoutImage?: string;
}

interface Match {
  id: string;
  type: '1on1' | '2on2';
  status: 'not_started' | 'live' | 'finished';
  date: string;
  // 1v1 fields
  homePlayerName?: string;
  awayPlayerName?: string;
  // 2v2 fields
  homeTeamName?: string;
  homePlayer1Name?: string;
  homePlayer2Name?: string;
  awayTeamName?: string;
  awayPlayer1Name?: string;
  awayPlayer2Name?: string;
  // Scores
  homeScore?: number;
  awayScore?: number;
  bestOf?: number;
  // Tracking data
  trackingData?: any;
}

export default function LiveEventOverlayPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Find next non-completed match
  const nextMatch = useMemo(() => {
    const now = new Date();
    const nonCompletedMatches = matches.filter(m => m.status !== 'finished');
    
    if (nonCompletedMatches.length === 0) return null;
    
    // Sort by date and status (prioritize live matches)
    const sorted = nonCompletedMatches.sort((a, b) => {
      // Prioritize live matches
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (b.status === 'live' && a.status !== 'live') return 1;
      
      // Then sort by date
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });
    
    return sorted[0] || null;
  }, [matches]);

  // Calculate tracking stats for live match
  const trackingStats = useMemo(() => {
    if (!nextMatch || nextMatch.status !== 'live' || !nextMatch.trackingData) {
      return null;
    }

    const trackingData = nextMatch.trackingData;
    const gameState = trackingData.gameState || {};
    const gameHistory = Array.isArray(trackingData.gameHistory) ? trackingData.gameHistory : [];
    const selectedPlayers = trackingData.selectedPlayers || {};

    // Check if current game has ended
    const gameEnded = gameState.gameEnded || false;
    
    // Calculate live score (considering overtime)
    const phase = gameState.phase || 'regular';
    // If game ended, show 0-0, otherwise show actual score
    const liveHomeScore = gameEnded ? 0 : (phase === 'overtime'
      ? (Number(gameState.homeScore || 0) + Number(gameState.otHome || 0))
      : Number(gameState.homeScore || 0));
    const liveAwayScore = gameEnded ? 0 : (phase === 'overtime'
      ? (Number(gameState.awayScore || 0) + Number(gameState.otAway || 0))
      : Number(gameState.awayScore || 0));

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
      }
    });

    // Calculate hit rates
    Object.keys(playerStats).forEach(playerId => {
      const stats = playerStats[playerId];
      stats.hitRate = stats.throws > 0 ? Math.round((stats.hits / stats.throws) * 100) : 0;
    });

    // For 1v1, also aggregate stats by team since player IDs might not match exactly
    const teamStats1v1: Record<'home' | 'away', { throws: number; hits: number; hitRate: number }> = {
      home: { throws: 0, hits: 0, hitRate: 0 },
      away: { throws: 0, hits: 0, hitRate: 0 }
    };
    
    if (nextMatch.type === '1on1') {
      gameHistory.forEach((action: any) => {
        if (!action.playerId || !action.team) return;
        teamStats1v1[action.team].throws++;
        if (action.type === 'hit') {
          teamStats1v1[action.team].hits++;
        }
      });
      
      Object.keys(teamStats1v1).forEach(team => {
        const stats = teamStats1v1[team as 'home' | 'away'];
        stats.hitRate = stats.throws > 0 ? Math.round((stats.hits / stats.throws) * 100) : 0;
      });
    }

    // Get player names and IDs
    const getPlayerName = (playerId: string, team: 'home' | 'away') => {
      if (nextMatch.type === '1on1') {
        return team === 'home' 
          ? (nextMatch.homePlayerName || 'Home Player')
          : (nextMatch.awayPlayerName || 'Away Player');
      } else {
        // For 2v2, we need to match playerId to the player names
        // Since we don't have player IDs in the match data, we'll use the names directly
        if (team === 'home') {
          if (playerId === selectedPlayers.homeFirst || playerId === gameState.homeFirstPlayer) {
            return nextMatch.homePlayer1Name || 'Home Player 1';
          }
          return nextMatch.homePlayer2Name || 'Home Player 2';
        } else {
          if (playerId === selectedPlayers.awayFirst || playerId === gameState.awayFirstPlayer) {
            return nextMatch.awayPlayer1Name || 'Away Player 1';
          }
          return nextMatch.awayPlayer2Name || 'Away Player 2';
        }
      }
    };

    // Build player arrays
    const homePlayers: Array<{ id: string; name: string }> = [];
    const awayPlayers: Array<{ id: string; name: string }> = [];

    if (nextMatch.type === '1on1') {
      // For 1v1, find the actual player ID from gameHistory by team
      let homeId = selectedPlayers.homeFirst || gameState.homeFirstPlayer || 'home';
      let awayId = selectedPlayers.awayFirst || gameState.awayFirstPlayer || 'away';
      
      // Try to find actual player IDs from gameHistory
      const homeAction = gameHistory.find((a: any) => a.team === 'home' && a.playerId);
      const awayAction = gameHistory.find((a: any) => a.team === 'away' && a.playerId);
      
      if (homeAction && homeAction.playerId) {
        homeId = homeAction.playerId;
      }
      if (awayAction && awayAction.playerId) {
        awayId = awayAction.playerId;
      }
      
      homePlayers.push({ id: homeId, name: nextMatch.homePlayerName || 'Home Player' });
      awayPlayers.push({ id: awayId, name: nextMatch.awayPlayerName || 'Away Player' });
    } else {
      const homeFirstId = selectedPlayers.homeFirst || gameState.homeFirstPlayer || 'home1';
      const homeSecondId = selectedPlayers.homeSecond || gameState.homeSecondPlayer || 'home2';
      const awayFirstId = selectedPlayers.awayFirst || gameState.awayFirstPlayer || 'away1';
      const awaySecondId = selectedPlayers.awaySecond || gameState.awaySecondPlayer || 'away2';
      
      homePlayers.push(
        { id: homeFirstId, name: nextMatch.homePlayer1Name || 'Home Player 1' },
        { id: homeSecondId, name: nextMatch.homePlayer2Name || 'Home Player 2' }
      );
      awayPlayers.push(
        { id: awayFirstId, name: nextMatch.awayPlayer1Name || 'Away Player 1' },
        { id: awaySecondId, name: nextMatch.awayPlayer2Name || 'Away Player 2' }
      );
    }

    // Calculate team hit rates
    const homeTeamStats = homePlayers.reduce((acc, player) => {
      const stats = playerStats[player.id] || { throws: 0, hits: 0 };
      acc.throws += stats.throws;
      acc.hits += stats.hits;
      return acc;
    }, { throws: 0, hits: 0 });

    const awayTeamStats = awayPlayers.reduce((acc, player) => {
      const stats = playerStats[player.id] || { throws: 0, hits: 0 };
      acc.throws += stats.throws;
      acc.hits += stats.hits;
      return acc;
    }, { throws: 0, hits: 0 });

    const homeTeamHitRate = homeTeamStats.throws > 0 
      ? Math.round((homeTeamStats.hits / homeTeamStats.throws) * 100) 
      : 0;
    
    const awayTeamHitRate = awayTeamStats.throws > 0 
      ? Math.round((awayTeamStats.hits / awayTeamStats.throws) * 100) 
      : 0;

    // Get match wins and current game from gameState
    const matchWins = gameState.matchWins || { home: 0, away: 0 };
    const currentGame = gameState.currentGame || 1;
    const currentTurn = gameState.currentTurn || 'home';
    
    // Get previous games results from matchHistory with actual scores
    const matchHistory = gameState.matchHistory || [];
    let previousGamesResults = matchHistory
      .filter((game: any) => game.winner !== null && game.gameNumber < currentGame)
      .sort((a: any, b: any) => a.gameNumber - b.gameNumber)
      .map((game: any) => {
        // Calculate final score from gameHistory
        let homeScore = 0;
        let awayScore = 0;
        
        if (game.gameHistory && Array.isArray(game.gameHistory)) {
          game.gameHistory.forEach((action: any) => {
            if (action.type === 'hit') {
              if (action.team === 'home') {
                homeScore++;
              } else {
                awayScore++;
              }
            }
          });
        }
        
        return `${homeScore}-${awayScore}`;
      });
    
    // If current game ended, add it to previous games results
    if (gameEnded && nextMatch.bestOf && nextMatch.bestOf > 1) {
      // Calculate final score of current game
      let currentGameHomeScore = 0;
      let currentGameAwayScore = 0;
      
      // Calculate from gameHistory (including overtime)
      const finalPhase = phase;
      if (finalPhase === 'overtime') {
        currentGameHomeScore = Number(gameState.homeScore || 0) + Number(gameState.otHome || 0);
        currentGameAwayScore = Number(gameState.awayScore || 0) + Number(gameState.otAway || 0);
      } else {
        // Calculate from gameHistory
        gameHistory.forEach((action: any) => {
          if (action.type === 'hit') {
            if (action.team === 'home') {
              currentGameHomeScore++;
            } else {
              currentGameAwayScore++;
            }
          }
        });
      }
      
      // Add current game result to previous games
      previousGamesResults = [...previousGamesResults, `${currentGameHomeScore}-${currentGameAwayScore}`];
    }

    // Calculate aggregate stats across all games (if BO > 1)
    const aggregatePlayerStats: Record<string, { throws: number; hits: number; hitRate: number }> = {};
    let aggregateHomeTeamThrows = 0;
    let aggregateHomeTeamHits = 0;
    let aggregateAwayTeamThrows = 0;
    let aggregateAwayTeamHits = 0;

    if (nextMatch.bestOf && nextMatch.bestOf > 1) {
      // Add current game stats
      gameHistory.forEach((action: any) => {
        if (!action.playerId) return;
        
        if (!aggregatePlayerStats[action.playerId]) {
          aggregatePlayerStats[action.playerId] = { throws: 0, hits: 0, hitRate: 0 };
        }
        
        aggregatePlayerStats[action.playerId].throws++;
        if (action.type === 'hit') {
          aggregatePlayerStats[action.playerId].hits++;
          if (action.team === 'home') {
            aggregateHomeTeamHits++;
          } else {
            aggregateAwayTeamHits++;
          }
        }
        if (action.team === 'home') {
          aggregateHomeTeamThrows++;
        } else {
          aggregateAwayTeamThrows++;
        }
      });

      // Add previous games stats
      matchHistory.forEach((game: any) => {
        if (game.gameHistory && Array.isArray(game.gameHistory)) {
          game.gameHistory.forEach((action: any) => {
            if (!action.playerId) return;
            
            if (!aggregatePlayerStats[action.playerId]) {
              aggregatePlayerStats[action.playerId] = { throws: 0, hits: 0, hitRate: 0 };
            }
            
            aggregatePlayerStats[action.playerId].throws++;
            if (action.type === 'hit') {
              aggregatePlayerStats[action.playerId].hits++;
              if (action.team === 'home') {
                aggregateHomeTeamHits++;
              } else {
                aggregateAwayTeamHits++;
              }
            }
            if (action.team === 'home') {
              aggregateHomeTeamThrows++;
            } else {
              aggregateAwayTeamThrows++;
            }
          });
        }
      });

      // Calculate aggregate hit rates
      Object.keys(aggregatePlayerStats).forEach(playerId => {
        const stats = aggregatePlayerStats[playerId];
        stats.hitRate = stats.throws > 0 ? Math.round((stats.hits / stats.throws) * 100) : 0;
      });
    }

    const aggregateHomeTeamHitRate = aggregateHomeTeamThrows > 0 
      ? Math.round((aggregateHomeTeamHits / aggregateHomeTeamThrows) * 100) 
      : 0;
    
    const aggregateAwayTeamHitRate = aggregateAwayTeamThrows > 0 
      ? Math.round((aggregateAwayTeamHits / aggregateAwayTeamThrows) * 100) 
      : 0;

    return {
      liveHomeScore,
      liveAwayScore,
      phase,
      playerStats,
      homePlayers,
      awayPlayers,
      homeTeamHitRate,
      awayTeamHitRate,
      matchWins,
      currentGame,
      currentTurn,
      previousGamesResults,
      aggregatePlayerStats,
      aggregateHomeTeamHitRate,
      aggregateAwayTeamHitRate,
      teamStats1v1: nextMatch.type === '1on1' ? teamStats1v1 : undefined,
    };
  }, [nextMatch]);

  useEffect(() => {
    // Fetch event data and matches from public endpoints
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch event
        const eventResponse = await fetch(`/api/event/public/${eventId}`);
        const eventData = await eventResponse.json();
        
        if (eventData.success && eventData.data) {
          setEvent(eventData.data);
        } else {
          setError(eventData.error || 'Event not found');
          return;
        }
        
        // Fetch matches
        const matchesResponse = await fetch(`/api/event/public/${eventId}/matches`);
        const matchesData = await matchesResponse.json();
        
        if (matchesData.success && matchesData.data) {
          setMatches(matchesData.data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load event');
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      fetchData();
      
      // Poll for updates every 2 seconds
      const interval = setInterval(() => {
        fetch(`/api/event/public/${eventId}/matches`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              setMatches(data.data);
            }
          })
          .catch(err => console.error('Error polling matches:', err));
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [eventId]);

  // Clean up any wrapper divs from root layout
  useEffect(() => {
    // Remove background image and overlay from body
    const body = document.body;
    body.style.backgroundImage = 'none';
    body.style.backgroundColor = 'white';
    body.style.background = 'white';
    body.style.margin = '0';
    body.style.padding = '0';
    
    // Hide root layout overlay div (the gradient overlay)
    const rootOverlay = document.querySelector('div[style*="linear-gradient"]');
    if (rootOverlay) {
      (rootOverlay as HTMLElement).style.display = 'none';
    }
    
    // Hide Toaster
    const toaster = document.querySelector('[data-sonner-toaster]');
    if (toaster) {
      (toaster as HTMLElement).style.display = 'none';
    }
    
    // Remove wrapper divs from Providers
    const wrapperDivs = document.querySelectorAll('body > div');
    wrapperDivs.forEach((div) => {
      const element = div as HTMLElement;
      // Remove Providers wrapper styling
      if (element.classList.contains('relative')) {
        element.style.position = 'static';
        element.style.zIndex = 'auto';
        element.style.margin = '0';
        element.style.padding = '0';
      }
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-white" style={{ width: '1920px', height: '1080px' }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#ff073a]" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-white" style={{ width: '1920px', height: '1080px' }}>
        <div className="text-center">
          <p className="text-[#ff073a] text-lg">{error || 'Event not found'}</p>
        </div>
      </div>
    );
  }

  // Get layout image URL - use event's layoutImage or default to bg.png
  const layoutImageUrl = event.layoutImage || '/bg.png';

  // Only render the preview component - nothing else!
  return (
    <LiveMatchLayout
      layoutImage={layoutImageUrl}
      showTwitchChat={event.showTwitchChat || false}
    >
      {{
        videoArea: (
          <div className="w-full h-full flex items-center justify-center text-white/40">
            <span style={{ fontSize: "16px" }}>OBS Video Area</span>
          </div>
        ),
        teamDetails: nextMatch && nextMatch.status === 'live' && trackingStats ? (
          // Live match - show compact stats
          <div className="h-full flex items-center justify-between px-12">
            {/* Home Team/Player with Stats */}
            <div className="flex items-center gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  {trackingStats.currentTurn === 'home' && (
                    <span className="text-[#ff5c1a] text-xl font-bold">→</span>
                  )}
                  <span className="text-white text-2xl font-bold">
                    {nextMatch.type === '1on1'
                      ? nextMatch.homePlayerName || 'Home Player'
                      : nextMatch.homeTeamName || 'Home Team'}
                  </span>
                  <span className="text-[#ff5c1a] text-sm font-semibold">
                    ({trackingStats.homeTeamHitRate}%)
                  </span>
                  {nextMatch.bestOf && nextMatch.bestOf > 1 && trackingStats.aggregateHomeTeamHitRate > 0 && (
                    <span className="text-white/40 text-xs font-normal">
                      [{trackingStats.aggregateHomeTeamHitRate}%]
                    </span>
                  )}
                </div>
                {/* Player Stats */}
                {nextMatch.type === '2on2' && (
                  <div className="flex flex-col gap-1.5">
                    {trackingStats.homePlayers.filter(p => p.id).map((player, idx) => {
                      const stats = player.id && trackingStats.playerStats ? (trackingStats.playerStats[player.id] || null) : null;
                      const aggregateStats = nextMatch.bestOf && nextMatch.bestOf > 1 && player.id && trackingStats.aggregatePlayerStats 
                        ? (trackingStats.aggregatePlayerStats[player.id] || null) 
                        : null;
                      return (
                        <div key={idx} className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-gray-300 w-40 truncate">{player.name}</span>
                            {stats ? (
                              <span className="text-white font-semibold">
                                {stats.hits}/{stats.throws} ({stats.hitRate}%)
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">0/0 (0%)</span>
                            )}
                          </div>
                          {aggregateStats && stats && aggregateStats.throws > stats.throws && (
                            <div className="flex items-center gap-3 text-xs pl-2">
                              <span className="text-white/30 w-40 truncate"></span>
                              <span className="text-white/40 font-normal">
                                {aggregateStats.hits}/{aggregateStats.throws} ({aggregateStats.hitRate}%)
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* For 1v1, show stats without player name (already shown above) */}
                {nextMatch.type === '1on1' && trackingStats.teamStats1v1 && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-white font-semibold">
                        {trackingStats.teamStats1v1.home.hits}/{trackingStats.teamStats1v1.home.throws} ({trackingStats.teamStats1v1.home.hitRate}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Score */}
            <div className="flex flex-col items-center gap-1 leading-none">
              {/* BO */}
              {nextMatch.bestOf && nextMatch.bestOf > 1 && (
                <div className="">
                  <span className="text-white/80 text-sm font-semibold">BO{nextMatch.bestOf}</span>
                </div>
              )}
              {/* Match Score */}
              {nextMatch.bestOf && nextMatch.bestOf > 1 && (
                <>
                  <div className="">
                    <span className="text-white/80 text-sm font-semibold">
                      ({trackingStats.matchWins.home} - {trackingStats.matchWins.away})
                    </span>
                  </div>
                  {trackingStats.previousGamesResults.length > 0 && (
                    <div className="">
                      <span className="text-white/60 text-xs">
                        ({trackingStats.previousGamesResults.join(', ')})
                      </span>
                    </div>
                  )}
                </>
              )}
              {/* Current Game Score */}
              <div className="flex items-center gap-4 leading-none mb-6">
                <span className="text-white text-4xl font-bold">{trackingStats.liveHomeScore}</span>
                <span className="text-[#ff5c1a] text-2xl font-bold">-</span>
                <span className="text-white text-4xl font-bold">{trackingStats.liveAwayScore}</span>
              </div>
              {trackingStats.phase === 'overtime' && (
                <span className="text-yellow-400 text-sm font-semibold">OVERTIME</span>
              )}
            </div>

            {/* Away Team/Player with Stats */}
            <div className="flex items-center gap-6">
              <div className="flex flex-col gap-2 items-end">
                <div className="flex items-center gap-3">
                  {nextMatch.bestOf && nextMatch.bestOf > 1 && trackingStats.aggregateAwayTeamHitRate > 0 && (
                    <span className="text-white/40 text-xs font-normal">
                      [{trackingStats.aggregateAwayTeamHitRate}%]
                    </span>
                  )}
                  <span className="text-[#ff5c1a] text-sm font-semibold">
                    ({trackingStats.awayTeamHitRate}%)
                  </span>
                  <span className="text-white text-2xl font-bold">
                    {nextMatch.type === '1on1'
                      ? nextMatch.awayPlayerName || 'Away Player'
                      : nextMatch.awayTeamName || 'Away Team'}
                  </span>
                  {trackingStats.currentTurn === 'away' && (
                    <span className="text-[#ff5c1a] text-xl font-bold">←</span>
                  )}
                </div>
                {/* Player Stats */}
                {nextMatch.type === '2on2' && (
                  <div className="flex flex-col gap-1.5">
                    {trackingStats.awayPlayers.filter(p => p.id).map((player, idx) => {
                      const stats = player.id && trackingStats.playerStats ? (trackingStats.playerStats[player.id] || null) : null;
                      const aggregateStats = nextMatch.bestOf && nextMatch.bestOf > 1 && player.id && trackingStats.aggregatePlayerStats 
                        ? (trackingStats.aggregatePlayerStats[player.id] || null) 
                        : null;
                      return (
                        <div key={idx} className="flex flex-col gap-0.5 items-end">
                          <div className="flex items-center gap-3 text-sm justify-end">
                            {stats ? (
                              <span className="text-white font-semibold">
                                {stats.hits}/{stats.throws} ({stats.hitRate}%)
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">0/0 (0%)</span>
                            )}
                            <span className="text-gray-300 w-40 truncate text-right">{player.name}</span>
                          </div>
                          {aggregateStats && stats && aggregateStats.throws > stats.throws && (
                            <div className="flex items-center gap-3 text-xs justify-end pr-2">
                              <span className="text-white/40 font-normal">
                                {aggregateStats.hits}/{aggregateStats.throws} ({aggregateStats.hitRate}%)
                              </span>
                              <span className="text-white/30 w-40 truncate text-right"></span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* For 1v1, show stats without player name (already shown above) */}
                {nextMatch.type === '1on1' && trackingStats.teamStats1v1 && (
                  <div className="flex flex-col gap-1.5 items-end">
                    <div className="flex items-center gap-3 text-sm justify-end">
                      <span className="text-white font-semibold">
                        {trackingStats.teamStats1v1.away.hits}/{trackingStats.teamStats1v1.away.throws} ({trackingStats.teamStats1v1.away.hitRate}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : nextMatch ? (
          // Next match preview (not started yet)
          <div className="h-full flex items-center justify-between px-12">
            {/* Home Team/Player */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-white text-2xl font-bold">
                  {nextMatch.type === '1on1'
                    ? nextMatch.homePlayerName || 'Home Player'
                    : nextMatch.homeTeamName || 'Home Team'}
                </span>
                {nextMatch.type === '2on2' && (
                  <span className="text-gray-400 text-sm">
                    {nextMatch.homePlayer1Name || 'Player 1'} & {nextMatch.homePlayer2Name || 'Player 2'}
                  </span>
                )}
              </div>
            </div>

            {/* Match Info */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-white text-lg font-semibold">VS</div>
              <div className="text-[#ff5c1a] text-sm font-medium">
                {new Date(nextMatch.date).toLocaleDateString("hu-HU", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="text-white text-xl font-bold">
                {new Date(nextMatch.date).toLocaleTimeString("hu-HU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            {/* Away Team/Player */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-white text-2xl font-bold">
                  {nextMatch.type === '1on1'
                    ? nextMatch.awayPlayerName || 'Away Player'
                    : nextMatch.awayTeamName || 'Away Team'}
                </span>
                {nextMatch.type === '2on2' && (
                  <span className="text-gray-400 text-sm">
                    {nextMatch.awayPlayer1Name || 'Player 1'} & {nextMatch.awayPlayer2Name || 'Player 2'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          // No next match
          <div className="h-full flex flex-col items-center justify-center p-4">
            <h3 className="text-white text-lg font-semibold mb-2">{event.name}</h3>
            <p className="text-white/60 text-sm">
              {new Date(event.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            {event.location && (
              <p className="text-white/60 text-sm mt-1">{event.location}</p>
            )}
            <p className="text-white/40 text-sm mt-4">There is no next match</p>
          </div>
        ),
      }}
    </LiveMatchLayout>
  );
}

