"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FiRotateCcw, FiTarget, FiX } from "react-icons/fi";

interface Player {
  id: string;
  label: string;
}

interface ThrowTracker2v2Props {
  homePlayers: Player[];
  awayPlayers: Player[];
  matchId?: string;
  onStateChange?: (state: any) => void;
  className?: string;
}

interface GameState {
  homeScore: number;
  awayScore: number;
  currentTurn: 'home' | 'away';
  phase: 'regular' | 'overtime' | 'return_serve';
  homeFirstPlayer: string;
  homeSecondPlayer: string;
  awayFirstPlayer: string;
  awaySecondPlayer: string;
  lastThrower: string | null;
  consecutiveThrows: number;
  returnServeCount: number;
  gameHistory: GameAction[];
  initThrowsCount: number;
  throwsInTurn: number;
  hitsInTurn: number;
  rebuttalCupsToMake?: number;
  rebuttalMode?: 'gt3' | 'lte3' | 'onecup_double';
  rebuttalStep?: number;
  rebuttalAttemptsLeft?: number;
  rebuttalLastShooter?: string | null;
  exitTeam?: 'home' | 'away';
  gameEnded?: boolean;
  otHome?: number;
  otAway?: number;
  overtimePeriod?: number;
  lastOvertimeThrower?: string | null;
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

export function ThrowTracker2v2({ homePlayers, awayPlayers, matchId, onStateChange, className }: ThrowTracker2v2Props) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    homeScore: 0,
    awayScore: 0,
    currentTurn: 'home',
    phase: 'regular',
    homeFirstPlayer: homePlayers[0]?.id || '',
    homeSecondPlayer: homePlayers[1]?.id || '',
    awayFirstPlayer: awayPlayers[0]?.id || '',
    awaySecondPlayer: awayPlayers[1]?.id || '',
    lastThrower: null,
    consecutiveThrows: 0,
    returnServeCount: 0,
    gameHistory: [],
    initThrowsCount: 0,
    throwsInTurn: 0,
    hitsInTurn: 0,
    otHome: 0,
    otAway: 0,
    overtimePeriod: 0,
    lastOvertimeThrower: null
  });

  const localStorageKey = matchId ? `match-2v2-${matchId}` : null;

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
    
    const wasLoaded = loadFromLocalStorage();
    if (!wasLoaded) {
      setGameState(prev => ({
        ...prev,
        homeFirstPlayer: homePlayers[0]?.id || '',
        homeSecondPlayer: homePlayers[1]?.id || '',
        awayFirstPlayer: awayPlayers[0]?.id || '',
        awaySecondPlayer: awayPlayers[1]?.id || '',
      }));
    }
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

  const getPlayerName = useCallback((playerId: string, team: 'home' | 'away') => {
    const players = team === 'home' ? homePlayers : awayPlayers;
    return players.find(p => p.id === playerId)?.label || playerId;
  }, [homePlayers, awayPlayers]);

  const handleThrow = (type: 'hit' | 'miss', playerId: string) => {
    const team = gameState.currentTurn;
    const isHome = team === 'home';
    
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
      let newPhase = prev.phase;
      let newCurrentTurn = prev.currentTurn;
      let newLastThrower = playerId;
      let newConsecutiveThrows = prev.consecutiveThrows;
      let newReturnServeCount = prev.returnServeCount;
      let newInitThrows = prev.initThrowsCount;
      let newThrowsInTurn = prev.throwsInTurn;
      let newHitsInTurn = prev.hitsInTurn;
      let newRebuttalStep = (prev.rebuttalStep || 0);
      let newRebuttalAttemptsLeft = prev.rebuttalAttemptsLeft;
      let newRebuttalLastShooter = prev.rebuttalLastShooter || null;
      let newGameEnded = prev.gameEnded || false;
      let newOtHome = prev.otHome ?? 0;
      let newOtAway = prev.otAway ?? 0;
      let newOvertimePeriod = prev.overtimePeriod ?? 0;
      let newLastOvertimeThrower = prev.lastOvertimeThrower || null;

      // Starting sequence
      if (prev.phase === 'regular' && newInitThrows === 0) {
        if (type === 'hit') {
          if (isHome) newHomeScore++; else newAwayScore++;
        }
        newLastThrower = playerId;
        newConsecutiveThrows = 0;
        newThrowsInTurn = 0;
        newHitsInTurn = 0;
        newInitThrows = 1;
        newCurrentTurn = 'away';
      } else {
        // Return serve handling
        if (prev.phase === 'return_serve') {
          if (prev.rebuttalMode === 'gt3') {
            if (type === 'miss') {
              newGameEnded = true;
            } else {
              if (isHome) newHomeScore = newHomeScore + 1; else newAwayScore = newAwayScore + 1;
              const remaining = Math.max((prev.rebuttalCupsToMake || 0) - 1, 0);
              newReturnServeCount = remaining;
              newRebuttalLastShooter = playerId;
              if (remaining <= 0) {
                newPhase = 'overtime';
                newCurrentTurn = prev.exitTeam || 'home';
                newThrowsInTurn = 0;
                newHitsInTurn = 0;
                newConsecutiveThrows = 0;
                newOvertimePeriod = (prev.overtimePeriod || 0) + 1;
              }
            }
            newConsecutiveThrows = 0; newThrowsInTurn = 0; newHitsInTurn = 0;
          } else if (prev.rebuttalMode === 'lte3') {
            if (type === 'miss') {
              newGameEnded = true;
            } else {
              if (isHome) newHomeScore = newHomeScore + 1; else newAwayScore = newAwayScore + 1;
              const remaining = Math.max((prev.rebuttalCupsToMake || 0) - 1, 0);
              newReturnServeCount = remaining;
              newRebuttalStep = (prev.rebuttalStep || 0) + 1;
              newRebuttalLastShooter = playerId;
              if (remaining <= 0) {
                newPhase = 'overtime';
                newCurrentTurn = prev.exitTeam || 'home';
                newThrowsInTurn = 0;
                newHitsInTurn = 0;
                newConsecutiveThrows = 0;
                newOvertimePeriod = (prev.overtimePeriod || 0) + 1;
              }
            }
            newConsecutiveThrows = 0; newThrowsInTurn = 0; newHitsInTurn = 0;
          } else if (prev.rebuttalMode === 'onecup_double') {
            if (type === 'hit') {
              if (isHome) newHomeScore = newHomeScore + 1; else newAwayScore = newAwayScore + 1;
              newPhase = 'overtime';
              newCurrentTurn = prev.exitTeam || 'home';
              newThrowsInTurn = 0;
              newHitsInTurn = 0;
              newConsecutiveThrows = 0;
              newOvertimePeriod = (prev.overtimePeriod || 0) + 1;
            } else {
              const attemptsBefore = (prev.rebuttalAttemptsLeft ?? (prev.rebuttalLastShooter ? 1 : 2));
              const left = attemptsBefore - 1;
              newRebuttalAttemptsLeft = left;
              if (attemptsBefore >= 2 && !prev.rebuttalLastShooter) {
                newRebuttalLastShooter = playerId;
              } else {
                newRebuttalLastShooter = prev.rebuttalLastShooter || playerId;
              }
              if (left <= 0) newGameEnded = true;
            }
            newConsecutiveThrows = 0; newThrowsInTurn = 0; newHitsInTurn = 0;
          }
        } else if (prev.phase === 'overtime') {
          if (type === 'hit') {
            if (isHome) {
              newOtHome = newOtHome + 1;
            } else {
              newOtAway = newOtAway + 1;
            }
            newHitsInTurn = prev.hitsInTurn + 1;
            newThrowsInTurn = prev.throwsInTurn + 1;
            newConsecutiveThrows = newThrowsInTurn;
            newLastThrower = playerId;
            newLastOvertimeThrower = playerId;
            if (!prev.overtimePeriod || prev.overtimePeriod === 0) {
              newOvertimePeriod = 1;
            }
          } else {
            newThrowsInTurn = prev.throwsInTurn + 1;
            newConsecutiveThrows = newThrowsInTurn;
          }
          const exitThrowNumberInOt = newThrowsInTurn;
          if (newThrowsInTurn === 1) {
            newCurrentTurn = prev.currentTurn;
          } else if (newThrowsInTurn === 2) {
            if (newHitsInTurn === 2) {
              // allow third bonus
            } else {
              newCurrentTurn = isHome ? 'away' : 'home';
              newThrowsInTurn = 0; newHitsInTurn = 0; newConsecutiveThrows = 0;
            }
          } else if (newThrowsInTurn === 3) {
            newCurrentTurn = isHome ? 'away' : 'home';
            newThrowsInTurn = 0; newHitsInTurn = 0; newConsecutiveThrows = 0;
          }

          const otHome = newOtHome;
          const otAway = newOtAway;
          if (otHome >= 3 && otAway < 3) {
            const cupsToMake = Math.max(3 - otAway, 0);
            const mode = cupsToMake === 1 && exitThrowNumberInOt > 1 ? 'onecup_double' : 'lte3';
            const attemptsLeft = mode === 'onecup_double' ? 2 : undefined;
            return {
              ...prev,
              phase: 'return_serve',
              currentTurn: 'away',
              exitTeam: 'home',
              rebuttalMode: mode,
              rebuttalCupsToMake: cupsToMake,
              rebuttalStep: 0,
              rebuttalAttemptsLeft: attemptsLeft,
              consecutiveThrows: 0,
              throwsInTurn: 0,
              hitsInTurn: 0,
              homeScore: prev.homeScore + otHome,
              awayScore: prev.awayScore + otAway,
              otHome: 0,
              otAway: 0,
              overtimePeriod: newOvertimePeriod,
              lastOvertimeThrower: newLastOvertimeThrower,
              gameHistory: newHistory,
            } as GameState;
          }
          if (otAway >= 3 && otHome < 3) {
            const cupsToMake = Math.max(3 - otHome, 0);
            const mode = cupsToMake === 1 && exitThrowNumberInOt > 1 ? 'onecup_double' : 'lte3';
            const attemptsLeft = mode === 'onecup_double' ? 2 : undefined;
            return {
              ...prev,
              phase: 'return_serve',
              currentTurn: 'home',
              exitTeam: 'away',
              rebuttalMode: mode,
              rebuttalCupsToMake: cupsToMake,
              rebuttalStep: 0,
              rebuttalAttemptsLeft: attemptsLeft,
              consecutiveThrows: 0,
              throwsInTurn: 0,
              hitsInTurn: 0,
              homeScore: prev.homeScore + otHome,
              awayScore: prev.awayScore + otAway,
              otHome: 0,
              otAway: 0,
              overtimePeriod: newOvertimePeriod,
              lastOvertimeThrower: newLastOvertimeThrower,
              gameHistory: newHistory,
            } as GameState;
          }
        } else {
          // Regular turns
          if (type === 'hit') {
            if (isHome) newHomeScore++; else newAwayScore++;
            newHitsInTurn += 1;
          }
          newThrowsInTurn += 1;
          newConsecutiveThrows = newThrowsInTurn;

          if (newThrowsInTurn === 1) {
            newCurrentTurn = prev.currentTurn;
          } else if (newThrowsInTurn === 2) {
            if (newHitsInTurn === 2 && type === 'hit') {
              // allow one bonus throw
            } else {
              newCurrentTurn = isHome ? 'away' : 'home';
              newThrowsInTurn = 0;
              newHitsInTurn = 0;
              newConsecutiveThrows = 0;
            }
          } else if (newThrowsInTurn === 3) {
            newCurrentTurn = isHome ? 'away' : 'home';
            newThrowsInTurn = 0;
            newHitsInTurn = 0;
            newConsecutiveThrows = 0;
          }
        }
      }

      // Transition to rebuttal
      if (newPhase === 'regular') {
        if (newHomeScore >= 10 && newAwayScore < 10) {
          const need = 10 - newAwayScore;
          const exitThrowNumber = prev.throwsInTurn + 1;
          let mode: 'gt3' | 'lte3' | 'onecup_double' = need > 3 ? 'gt3' : 'lte3';
          let attemptsLeft: number | undefined = undefined;
          if (need === 1 && exitThrowNumber > 1) {
            mode = 'onecup_double';
            attemptsLeft = 2;
          }
          return {
            ...prev,
            homeScore: newHomeScore,
            awayScore: newAwayScore,
            phase: 'return_serve',
            currentTurn: 'away',
            exitTeam: 'home',
            rebuttalCupsToMake: need,
            rebuttalMode: mode,
            rebuttalStep: 0,
            rebuttalAttemptsLeft: attemptsLeft,
            returnServeCount: need,
            rebuttalLastShooter: null,
            consecutiveThrows: 0,
            throwsInTurn: 0,
            hitsInTurn: 0,
            gameHistory: newHistory,
          };
        } else if (newAwayScore >= 10 && newHomeScore < 10) {
          const need = 10 - newHomeScore;
          const exitThrowNumber = prev.throwsInTurn + 1;
          let mode: 'gt3' | 'lte3' | 'onecup_double' = need > 3 ? 'gt3' : 'lte3';
          let attemptsLeft: number | undefined = undefined;
          if (need === 1 && exitThrowNumber > 1) {
            mode = 'onecup_double';
            attemptsLeft = 2;
          }
          return {
            ...prev,
            homeScore: newHomeScore,
            awayScore: newAwayScore,
            phase: 'return_serve',
            currentTurn: 'home',
            exitTeam: 'away',
            rebuttalCupsToMake: need,
            rebuttalMode: mode,
            rebuttalStep: 0,
            rebuttalAttemptsLeft: attemptsLeft,
            returnServeCount: need,
            rebuttalLastShooter: null,
            consecutiveThrows: 0,
            throwsInTurn: 0,
            hitsInTurn: 0,
            gameHistory: newHistory,
          };
        }
      }

      // Check for overtime start
      if (newPhase === 'regular' && newHomeScore >= 10 && newAwayScore >= 10) {
        newPhase = 'overtime';
      }

      return {
        ...prev,
        homeScore: newHomeScore,
        awayScore: newAwayScore,
        currentTurn: newCurrentTurn,
        phase: newPhase,
        lastThrower: newLastThrower,
        consecutiveThrows: newConsecutiveThrows,
        returnServeCount: newReturnServeCount,
        gameHistory: newHistory,
        initThrowsCount: newInitThrows,
        throwsInTurn: newThrowsInTurn,
        hitsInTurn: newHitsInTurn,
        rebuttalStep: newRebuttalStep,
        rebuttalAttemptsLeft: newRebuttalAttemptsLeft,
        rebuttalLastShooter: newRebuttalLastShooter,
        rebuttalCupsToMake: newReturnServeCount ?? prev.rebuttalCupsToMake,
        gameEnded: newGameEnded,
        otHome: newOtHome,
        otAway: newOtAway,
        overtimePeriod: newOvertimePeriod,
        lastOvertimeThrower: newLastOvertimeThrower
      };
    });
  };

  // Recompute from history for undo
  const recomputeFromHistory = (actions: GameAction[]): GameState => {
    let state: GameState = {
      homeScore: 0,
      awayScore: 0,
      currentTurn: 'home',
      phase: 'regular',
      homeFirstPlayer: gameState.homeFirstPlayer,
      homeSecondPlayer: gameState.homeSecondPlayer,
      awayFirstPlayer: gameState.awayFirstPlayer,
      awaySecondPlayer: gameState.awaySecondPlayer,
      lastThrower: null,
      consecutiveThrows: 0,
      returnServeCount: 0,
      gameHistory: [],
      initThrowsCount: 0,
      throwsInTurn: 0,
      hitsInTurn: 0,
      rebuttalCupsToMake: undefined,
      rebuttalMode: undefined,
      rebuttalStep: 0,
      rebuttalAttemptsLeft: undefined,
      rebuttalLastShooter: null,
      exitTeam: undefined,
      gameEnded: false,
      otHome: 0,
      otAway: 0,
      overtimePeriod: 0,
      lastOvertimeThrower: null,
    };

    const apply = (prev: GameState, action: GameAction): GameState => {
      if (prev.gameEnded) return prev;
      const isHome = action.team === 'home';
      let s = { ...prev } as GameState;
      s.gameHistory = [...s.gameHistory, action];

      if (s.phase === 'regular' && s.initThrowsCount === 0) {
        if (action.type === 'hit') {
          if (isHome) s.homeScore++; else s.awayScore++;
        }
        s.lastThrower = action.playerId;
        s.consecutiveThrows = 0;
        s.throwsInTurn = 0;
        s.hitsInTurn = 0;
        s.initThrowsCount = 1;
        s.currentTurn = 'away';
      } else if (s.phase === 'return_serve') {
        // Simplified return serve logic for undo
        if (action.type === 'miss') {
          s.gameEnded = true;
        } else {
          if (isHome) s.homeScore = s.homeScore + 1; else s.awayScore = s.awayScore + 1;
          const remaining = Math.max((s.rebuttalCupsToMake || 0) - 1, 0);
          s.rebuttalCupsToMake = remaining;
          s.returnServeCount = remaining;
          s.rebuttalLastShooter = action.playerId;
          if (remaining <= 0) {
            s.phase = 'overtime';
            s.currentTurn = s.exitTeam || 'home';
            s.overtimePeriod = (s.overtimePeriod || 0) + 1;
          }
        }
        s.consecutiveThrows = 0; s.throwsInTurn = 0; s.hitsInTurn = 0;
        s.lastThrower = action.playerId;
      } else if (s.phase === 'overtime') {
        if (action.type === 'hit') {
          if (isHome) {
            s.otHome = (s.otHome || 0) + 1;
          } else {
            s.otAway = (s.otAway || 0) + 1;
          }
          s.hitsInTurn += 1;
        }
        s.throwsInTurn += 1;
        s.consecutiveThrows = s.throwsInTurn;
        s.lastThrower = action.playerId;
        s.lastOvertimeThrower = action.playerId;
        
        if (!s.overtimePeriod || s.overtimePeriod === 0) {
          s.overtimePeriod = 1;
        }

        const exitThrowNumberInOt = s.throwsInTurn;

        if (s.throwsInTurn === 1) {
          s.currentTurn = s.currentTurn;
        } else if (s.throwsInTurn === 2) {
          if (s.hitsInTurn === 2 && action.type === 'hit') {
            // allow bonus
          } else {
            s.currentTurn = isHome ? 'away' : 'home';
            s.throwsInTurn = 0; s.hitsInTurn = 0; s.consecutiveThrows = 0;
          }
        } else if (s.throwsInTurn === 3) {
          s.currentTurn = isHome ? 'away' : 'home';
          s.throwsInTurn = 0; s.hitsInTurn = 0; s.consecutiveThrows = 0;
        }

        const otHome = s.otHome || 0;
        const otAway = s.otAway || 0;
        if (otHome >= 3 && otAway < 3) {
          const cupsToMake = Math.max(3 - otAway, 0);
          const mode = cupsToMake === 1 && exitThrowNumberInOt > 1 ? 'onecup_double' : 'lte3';
          const attemptsLeft = mode === 'onecup_double' ? 2 : undefined;
          
          s.phase = 'return_serve';
          s.currentTurn = 'away';
          s.exitTeam = 'home';
          s.rebuttalMode = mode;
          s.rebuttalCupsToMake = cupsToMake;
          s.rebuttalStep = 0;
          s.rebuttalAttemptsLeft = attemptsLeft;
          s.rebuttalLastShooter = null;
          s.consecutiveThrows = 0; s.throwsInTurn = 0; s.hitsInTurn = 0;
          s.homeScore = s.homeScore + otHome;
          s.awayScore = s.awayScore + otAway;
          s.otHome = 0;
          s.otAway = 0;
        } else if (otAway >= 3 && otHome < 3) {
          const cupsToMake = Math.max(3 - otHome, 0);
          const mode = cupsToMake === 1 && exitThrowNumberInOt > 1 ? 'onecup_double' : 'lte3';
          const attemptsLeft = mode === 'onecup_double' ? 2 : undefined;
          
          s.phase = 'return_serve';
          s.currentTurn = 'home';
          s.exitTeam = 'away';
          s.rebuttalMode = mode;
          s.rebuttalCupsToMake = cupsToMake;
          s.rebuttalStep = 0;
          s.rebuttalAttemptsLeft = attemptsLeft;
          s.rebuttalLastShooter = null;
          s.consecutiveThrows = 0; s.throwsInTurn = 0; s.hitsInTurn = 0;
          s.homeScore = s.homeScore + otHome;
          s.awayScore = s.awayScore + otAway;
          s.otHome = 0;
          s.otAway = 0;
        }
      } else {
        // regular
        if (action.type === 'hit') {
          if (isHome) s.homeScore++; else s.awayScore++;
          s.hitsInTurn += 1;
        }
        s.throwsInTurn += 1;
        const exitThrowNumberAfterThisThrow = s.throwsInTurn;
        s.consecutiveThrows = s.throwsInTurn;
        s.lastThrower = action.playerId;

        if (s.throwsInTurn === 1) {
          s.currentTurn = s.currentTurn;
        } else if (s.throwsInTurn === 2) {
          if (s.hitsInTurn === 2 && action.type === 'hit') {
            // allow bonus
          } else {
            s.currentTurn = isHome ? 'away' : 'home';
            s.throwsInTurn = 0; s.hitsInTurn = 0; s.consecutiveThrows = 0;
          }
        } else if (s.throwsInTurn === 3) {
          s.currentTurn = isHome ? 'away' : 'home';
          s.throwsInTurn = 0; s.hitsInTurn = 0; s.consecutiveThrows = 0;
        }

        if (s.phase === 'regular') {
          if (s.homeScore >= 10 && s.awayScore < 10) {
            const need = 10 - s.awayScore;
            const exitThrowNumber = exitThrowNumberAfterThisThrow;
            let mode: 'gt3' | 'lte3' | 'onecup_double' = need > 3 ? 'gt3' : 'lte3';
            let attemptsLeft: number | undefined = undefined;
            if (need === 1 && exitThrowNumber > 1) { mode = 'onecup_double'; attemptsLeft = 2; }
            s.phase = 'return_serve';
            s.currentTurn = 'away';
            s.exitTeam = 'home';
            s.rebuttalCupsToMake = need;
            s.rebuttalMode = mode;
            s.rebuttalStep = 0;
            s.rebuttalAttemptsLeft = attemptsLeft;
            s.rebuttalLastShooter = null;
            s.consecutiveThrows = 0; s.throwsInTurn = 0; s.hitsInTurn = 0;
          } else if (s.awayScore >= 10 && s.homeScore < 10) {
            const need = 10 - s.homeScore;
            const exitThrowNumber = exitThrowNumberAfterThisThrow;
            let mode: 'gt3' | 'lte3' | 'onecup_double' = need > 3 ? 'gt3' : 'lte3';
            let attemptsLeft: number | undefined = undefined;
            if (need === 1 && exitThrowNumber > 1) { mode = 'onecup_double'; attemptsLeft = 2; }
            s.phase = 'return_serve';
            s.currentTurn = 'home';
            s.exitTeam = 'away';
            s.rebuttalCupsToMake = need;
            s.rebuttalMode = mode;
            s.rebuttalStep = 0;
            s.rebuttalAttemptsLeft = attemptsLeft;
            s.rebuttalLastShooter = null;
            s.consecutiveThrows = 0; s.throwsInTurn = 0; s.hitsInTurn = 0;
          }
        }

        if (s.phase === 'regular' && s.homeScore >= 10 && s.awayScore >= 10) {
          s.phase = 'overtime';
          s.overtimePeriod = 1;
        }
      }

      return s;
    };

    actions.forEach(a => { state = apply(state, a); });
    return state;
  };

  const undoLastAction = () => {
    setGameState(prev => {
      if (prev.gameHistory.length === 0) return prev;
      const newHistory = prev.gameHistory.slice(0, -1);
      const recomputed = recomputeFromHistory(newHistory);
      return { ...recomputed, gameHistory: newHistory };
    });
  };

  // Convert game history to ThrowRecord format for display
  const throws: ThrowRecord[] = gameState.gameHistory.map((action, index) => ({
    id: `throw-${index}`,
    timestamp: new Date(action.timestamp).toISOString(),
    team: action.team,
    playerName: getPlayerName(action.playerId, action.team),
    made: action.type === 'hit'
  }));

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

  // Get current player options
  const getCurrentPlayerOptions = (): Array<{ id: string; name: string; type: 'hit' | 'miss'; disabled: boolean }> => {
    const team = gameState.currentTurn;
    const isHome = team === 'home';
    const firstPlayer = isHome ? gameState.homeFirstPlayer : gameState.awayFirstPlayer;
    const secondPlayer = isHome ? gameState.homeSecondPlayer : gameState.awaySecondPlayer;
    
    let canFirstPlayerThrow = true;
    let canSecondPlayerThrow = true;
    
    if (gameState.gameEnded) {
      canFirstPlayerThrow = false;
      canSecondPlayerThrow = false;
    } else if (gameState.phase === 'return_serve') {
      if (gameState.rebuttalMode === 'gt3') {
        if (!gameState.rebuttalLastShooter) {
          canFirstPlayerThrow = true;
          canSecondPlayerThrow = true;
        } else if (gameState.rebuttalLastShooter === firstPlayer) {
          canFirstPlayerThrow = false;
          canSecondPlayerThrow = true;
        } else {
          canFirstPlayerThrow = true;
          canSecondPlayerThrow = false;
        }
      } else if (gameState.rebuttalMode === 'lte3') {
        const step = gameState.rebuttalStep || 0;
        if (step === 0 || step >= 2) {
          canFirstPlayerThrow = true;
          canSecondPlayerThrow = true;
        } else {
          if (!gameState.rebuttalLastShooter) {
            canFirstPlayerThrow = true;
            canSecondPlayerThrow = true;
          } else if (gameState.rebuttalLastShooter === firstPlayer) {
            canFirstPlayerThrow = false;
            canSecondPlayerThrow = true;
          } else {
            canFirstPlayerThrow = true;
            canSecondPlayerThrow = false;
          }
        }
      } else if (gameState.rebuttalMode === 'onecup_double') {
        const left = gameState.rebuttalAttemptsLeft || 0;
        if (left >= 2) {
          canFirstPlayerThrow = true;
          canSecondPlayerThrow = true;
        } else if (left === 1) {
          canFirstPlayerThrow = gameState.rebuttalLastShooter !== firstPlayer;
          canSecondPlayerThrow = gameState.rebuttalLastShooter !== secondPlayer;
        } else {
          canFirstPlayerThrow = false;
          canSecondPlayerThrow = false;
        }
      }
    } else if (gameState.phase === 'overtime') {
      if (gameState.consecutiveThrows === 1) {
        const lastThrower = gameState.lastOvertimeThrower || gameState.lastThrower;
        if (lastThrower === firstPlayer) {
          canFirstPlayerThrow = false;
          canSecondPlayerThrow = true;
        } else {
          canFirstPlayerThrow = true;
          canSecondPlayerThrow = false;
        }
      } else {
        canFirstPlayerThrow = true;
        canSecondPlayerThrow = true;
      }
    } else if (gameState.phase === 'regular' && gameState.initThrowsCount === 0) {
      canFirstPlayerThrow = true;
      canSecondPlayerThrow = true;
    } else if (gameState.consecutiveThrows === 1 && gameState.phase === 'regular') {
      if (gameState.lastThrower === firstPlayer) {
        canFirstPlayerThrow = false;
        canSecondPlayerThrow = true;
      } else {
        canFirstPlayerThrow = true;
        canSecondPlayerThrow = false;
      }
    } else if (gameState.consecutiveThrows === 2 && gameState.phase === 'regular') {
      canFirstPlayerThrow = true;
      canSecondPlayerThrow = true;
    }
    
    return [
      { id: firstPlayer, name: getPlayerName(firstPlayer, team), type: 'hit', disabled: !canFirstPlayerThrow },
      { id: firstPlayer, name: getPlayerName(firstPlayer, team), type: 'miss', disabled: !canFirstPlayerThrow },
      { id: secondPlayer, name: getPlayerName(secondPlayer, team), type: 'hit', disabled: !canSecondPlayerThrow },
      { id: secondPlayer, name: getPlayerName(secondPlayer, team), type: 'miss', disabled: !canSecondPlayerThrow }
    ];
  };

  const playerOptions = getCurrentPlayerOptions();
  const currentThrowingPlayers = gameState.currentTurn === 'home' ? homePlayers : awayPlayers;
  const player1 = currentThrowingPlayers[0];
  const player2 = currentThrowingPlayers[1];

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
        <h3 className="text-lg font-semibold text-white text-center flex-1">Throw Tracker (2v2)</h3>
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
          {gameState.phase === 'overtime' 
            ? `Overtime (${gameState.overtimePeriod || 0}) - Home: ${gameState.homeScore + (gameState.otHome ?? 0)}, Away: ${gameState.awayScore + (gameState.otAway ?? 0)}`
            : `Home: ${gameState.homeScore} - Away: ${gameState.awayScore}`}
        </div>
        {gameState.phase === 'return_serve' && (
          <div className="text-[#ff073a] text-sm mt-1">
            Return Serve: {gameState.returnServeCount} cups remaining
          </div>
        )}
      </div>

      {/* Player buttons */}
      <div className="flex flex-col md:flex-row md:justify-between items-stretch md:items-start mb-6 gap-4">
        {/* Left side - 2 buttons (GREEN - for hits) */}
        <div className="flex flex-col gap-3 flex-1">
          {player1 && (
            <Button
              onClick={() => !playerOptions[0].disabled && handleThrow('hit', playerOptions[0].id)}
              disabled={playerOptions[0].disabled}
              className="w-full text-2xl md:text-3xl font-bold py-12 md:py-16 transition-all bg-green-500 border-2 border-green-400 text-white shadow-lg shadow-green-500/50 hover:bg-green-600 hover:shadow-green-500/70 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getPlayerName(player1.id, gameState.currentTurn)} - HIT
            </Button>
          )}
          {player2 && (
            <Button
              onClick={() => !playerOptions[2].disabled && handleThrow('hit', playerOptions[2].id)}
              disabled={playerOptions[2].disabled}
              className="w-full text-2xl md:text-3xl font-bold py-12 md:py-16 transition-all bg-green-500 border-2 border-green-400 text-white shadow-lg shadow-green-500/50 hover:bg-green-600 hover:shadow-green-500/70 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getPlayerName(player2.id, gameState.currentTurn)} - HIT
            </Button>
          )}
        </div>
        
        {/* Right side - 2 buttons (RED - for misses) */}
        <div className="flex flex-col gap-3 flex-1">
          {player1 && (
            <Button
              onClick={() => !playerOptions[1].disabled && handleThrow('miss', playerOptions[1].id)}
              disabled={playerOptions[1].disabled}
              className="w-full text-2xl md:text-3xl font-bold py-12 md:py-16 transition-all bg-red-500 border-2 border-red-400 text-white shadow-lg shadow-red-500/50 hover:bg-red-600 hover:shadow-red-500/70 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getPlayerName(player1.id, gameState.currentTurn)} - MISS
            </Button>
          )}
          {player2 && (
            <Button
              onClick={() => !playerOptions[3].disabled && handleThrow('miss', playerOptions[3].id)}
              disabled={playerOptions[3].disabled}
              className="w-full text-2xl md:text-3xl font-bold py-12 md:py-16 transition-all bg-red-500 border-2 border-red-400 text-white shadow-lg shadow-red-500/50 hover:bg-red-600 hover:shadow-red-500/70 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getPlayerName(player2.id, gameState.currentTurn)} - MISS
            </Button>
          )}
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

