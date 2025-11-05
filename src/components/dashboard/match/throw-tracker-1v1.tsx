"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FiRotateCcw } from "react-icons/fi";

interface Player {
  id: string;
  label: string;
}

interface ThrowTracker1v1Props {
  homePlayer: Player;
  awayPlayer: Player;
  matchId?: string;
  onStateChange?: (state: any) => void;
  className?: string;
}

interface GameState {
  homeScore: number;
  awayScore: number;
  currentTurn: 'home' | 'away';
  gameHistory: GameAction[];
  gameEnded?: boolean;
}

interface GameAction {
  type: 'hit' | 'miss';
  playerId: string;
  team: 'home' | 'away';
  timestamp: number;
}

interface ThrowRecord {
  id: string;
  timestamp: string;
  team: 'home' | 'away';
  playerName: string;
  made: boolean;
}

// Group throws into sets of 2-3 based on team
function groupThrows(throws: ThrowRecord[]): ThrowRecord[][] {
  if (throws.length === 0) return [];
  
  const groups: ThrowRecord[][] = [];
  let currentGroup: ThrowRecord[] = [];
  
  for (let i = 0; i < throws.length; i++) {
    const throwItem = throws[i];
    
    if (currentGroup.length === 0) {
      currentGroup.push(throwItem);
      continue;
    }
    
    const currentTeam = currentGroup[0].team;
    const nextThrow = i < throws.length - 1 ? throws[i + 1] : null;
    
    if (
      throwItem.team !== currentTeam ||
      currentGroup.length >= 3 ||
      (currentGroup.length >= 2 && nextThrow && nextThrow.team !== currentTeam)
    ) {
      groups.push([...currentGroup]);
      currentGroup = [throwItem];
    } else {
      currentGroup.push(throwItem);
    }
  }
  
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  return groups;
}

// Calculate score up to a specific throw index
function calculateScoreUpTo(throws: ThrowRecord[], upToIndex: number): { home: number; away: number } {
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

export function ThrowTracker1v1({ homePlayer, awayPlayer, matchId, onStateChange, className }: ThrowTracker1v1Props) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    homeScore: 0,
    awayScore: 0,
    currentTurn: 'home',
    gameHistory: [],
    gameEnded: false
  });

  const localStorageKey = matchId ? `match-1v1-${matchId}` : null;

  // Load from localStorage
  const loadFromLocalStorage = useCallback(() => {
    if (!localStorageKey) return false;
    try {
      const savedData = localStorage.getItem(localStorageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        const isDataValid = Date.now() - parsedData.timestamp < 24 * 60 * 60 * 1000;
        if (isDataValid) {
          setGameState(parsedData.gameState);
          return true;
        } else {
          localStorage.removeItem(localStorageKey);
        }
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      if (localStorageKey) localStorage.removeItem(localStorageKey);
    }
    return false;
  }, [localStorageKey]);

  // Save to localStorage
  const saveToLocalStorage = useCallback(() => {
    if (!localStorageKey) return;
    const dataToSave = {
      gameState,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [gameState, localStorageKey]);

  // Load on mount - only once
  useEffect(() => {
    if (isInitialized) return;
    
    loadFromLocalStorage();
    setIsInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save - only after initialization
  useEffect(() => {
    if (!isInitialized) return;
    
    saveToLocalStorage();
    if (onStateChange) {
      onStateChange(gameState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, isInitialized]);

  const handleThrow = (type: 'hit' | 'miss', playerId: string) => {
    if (gameState.gameEnded) return;

    const team = gameState.currentTurn;
    const isHome = team === 'home';
    
    // Determine which player should throw based on current turn
    const expectedPlayerId = isHome ? homePlayer.id : awayPlayer.id;
    // Only allow throw if it's the correct player's turn
    if (playerId !== expectedPlayerId) {
      console.warn(`Wrong player turn. Expected: ${expectedPlayerId}, Got: ${playerId}`);
      return;
    }
    
    const action: GameAction = {
      type,
      playerId,
      team,
      timestamp: Date.now()
    };

    setGameState(prev => {
      const newHistory = [...prev.gameHistory, action];
      let newHomeScore = prev.homeScore;
      let newAwayScore = prev.awayScore;
      let newCurrentTurn = prev.currentTurn;
      let newGameEnded = prev.gameEnded || false;

      // Update score
      if (type === 'hit') {
        if (isHome) {
          newHomeScore++;
        } else {
          newAwayScore++;
        }
      }

      // Switch turns after each throw
      newCurrentTurn = isHome ? 'away' : 'home';

      // Check for game end (first to 10 wins)
      if (newHomeScore >= 10 && newAwayScore < 10) {
        newGameEnded = true;
      } else if (newAwayScore >= 10 && newHomeScore < 10) {
        newGameEnded = true;
      }

      return {
        ...prev,
        homeScore: newHomeScore,
        awayScore: newAwayScore,
        currentTurn: newCurrentTurn,
        gameHistory: newHistory,
        gameEnded: newGameEnded
      };
    });
  };

  const undoLastAction = () => {
    setGameState(prev => {
      if (prev.gameHistory.length === 0) return prev;
      
      const newHistory = prev.gameHistory.slice(0, -1);
      
      // Recompute state from history
      let homeScore = 0;
      let awayScore = 0;
      let currentTurn: 'home' | 'away' = 'home';
      
      newHistory.forEach((action, index) => {
        if (action.type === 'hit') {
          if (action.team === 'home') {
            homeScore++;
          } else {
            awayScore++;
          }
        }
        // After each throw, the turn switches to the other team
        // So after processing this throw, the next turn would be the opposite team
        currentTurn = action.team === 'home' ? 'away' : 'home';
      });
      
      // If no history, start with home
      if (newHistory.length === 0) {
        currentTurn = 'home';
      }
      
      const gameEnded = (homeScore >= 10 && awayScore < 10) || (awayScore >= 10 && homeScore < 10);
      
      return {
        homeScore,
        awayScore,
        currentTurn,
        gameHistory: newHistory,
        gameEnded
      };
    });
  };

  // Convert game history to ThrowRecord format for display
  const throws: ThrowRecord[] = gameState.gameHistory.map((action, index) => ({
    id: `throw-${index}`,
    timestamp: new Date(action.timestamp).toISOString(),
    team: action.team,
    playerName: action.team === 'home' ? homePlayer.label : awayPlayer.label,
    made: action.type === 'hit'
  }));

  const currentPlayer = gameState.currentTurn === 'home' ? homePlayer : awayPlayer;

  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to end when new throws are added
  useEffect(() => {
    if (scrollContainerRef.current && throws.length > 0) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: 'smooth'
      });
    }
  }, [throws.length]);

  return (
    <div className={cn("w-full bg-[#0a0a0a] border border-[#ff073a]/30 rounded-lg p-4 relative", className)}>
      {/* Center line */}
      <div 
        className="absolute left-0 right-0 h-0.5 bg-white/20 z-0 pointer-events-none" 
        style={{ 
          top: 'calc(100% - 280px / 2 - 60px)'
        }} 
      />
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white text-center flex-1">Throw Tracker (1v1)</h3>
        {gameState.gameHistory.length > 0 && (
          <Button
            onClick={undoLastAction}
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white"
          >
            <FiRotateCcw className="w-4 h-4 mr-1" />
            Undo
          </Button>
        )}
      </div>

      {/* Score display */}
      <div className="mb-4 text-center">
        <div className="text-white/70 text-sm">
          Home: {gameState.homeScore} - Away: {gameState.awayScore}
        </div>
        {gameState.gameEnded && (
          <div className="text-[#ff073a] text-sm mt-1 font-bold">
            Game Ended - {gameState.homeScore >= 10 ? homePlayer.label : awayPlayer.label} Wins!
          </div>
        )}
        <div className="text-white/50 text-xs mt-1">
          {currentPlayer.label}'s turn
        </div>
      </div>

      {/* Player buttons */}
      <div className="flex flex-col md:flex-row md:justify-between items-stretch md:items-start mb-6 gap-4">
        {/* Left side - GREEN button (for hits) */}
        <div className="flex flex-col gap-3 flex-1">
          <Button
            onClick={() => handleThrow('hit', currentPlayer.id)}
            disabled={gameState.gameEnded}
            className="w-full text-2xl md:text-3xl font-bold py-12 md:py-16 transition-all bg-green-500 border-2 border-green-400 text-white shadow-lg shadow-green-500/50 hover:bg-green-600 hover:shadow-green-500/70 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentPlayer.label} - HIT
          </Button>
        </div>
        
        {/* Right side - RED button (for misses) */}
        <div className="flex flex-col gap-3 flex-1">
          <Button
            onClick={() => handleThrow('miss', currentPlayer.id)}
            disabled={gameState.gameEnded}
            className="w-full text-2xl md:text-3xl font-bold py-12 md:py-16 transition-all bg-red-500 border-2 border-red-400 text-white shadow-lg shadow-red-500/50 hover:bg-red-600 hover:shadow-red-500/70 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentPlayer.label} - MISS
          </Button>
        </div>
      </div>
      
      {/* Horizontal scrolling container */}
      <div 
        ref={scrollContainerRef}
        className="relative overflow-x-auto overflow-y-visible custom-scrollbar" 
        style={{ 
          minHeight: '280px', 
          paddingBottom: '60px', 
          paddingTop: '60px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#ff073a #0a0a0a'
        }}
      >
        <div className="flex items-center gap-4 min-w-max px-4" style={{ minHeight: '280px' }}>
          {throws.map((throwItem, index) => {
            const isHome = throwItem.team === 'home';
            const isMade = throwItem.made;
            const throwIndexInFullArray = throws.findIndex(t => t.id === throwItem.id);
            const score = calculateScoreUpTo(throws, throwIndexInFullArray);
            const playerName = throwItem.playerName;
            const scoreText = `${score.home}-${score.away}`;
            
            // Only animate the last 5 throws for better performance
            const shouldAnimate = index >= throws.length - 5;
            
            return (
              <motion.div
                key={throwItem.id}
                initial={shouldAnimate ? { opacity: 0, scale: 0 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={shouldAnimate ? { 
                  delay: 0,
                  duration: 0.2,
                  type: "spring",
                  stiffness: 400,
                  damping: 25
                } : { duration: 0 }}
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
                  className={cn(
                    "w-12 h-12 rounded-full border-2 flex items-center justify-center relative transition-all hover:scale-110 cursor-pointer",
                    isMade 
                      ? "bg-green-500 border-green-400 shadow-lg shadow-green-500/50" 
                      : "bg-red-500 border-red-400 shadow-lg shadow-red-500/50"
                  )}
                >
                  <div
                    className={cn(
                      "absolute w-0 h-0 border-l-[10px] border-r-[10px] border-l-transparent border-r-transparent",
                      isHome 
                        ? "top-full mt-2 border-t-[12px] border-t-white/40"
                        : "bottom-full mb-2 border-b-[12px] border-b-white/40"
                    )}
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
          
          {throws.length === 0 && (
            <div className="flex items-center justify-center w-full py-8">
              <p className="text-white/50 text-sm">No throws recorded yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

