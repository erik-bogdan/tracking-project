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

interface ThrowTracker1v1Props {
  homePlayer: Player;
  awayPlayer: Player;
  matchId?: string;
  bestOf?: number; // Best Of number (e.g., 7 for BO7)
  matchStatus?: 'not_started' | 'live' | 'finished';
  initialGameState?: any; // Initial game state from DB (for finished matches)
  onStateChange?: (state: any) => void;
  className?: string;
}

interface GameState {
  // Current game state
  homeScore: number;
  awayScore: number;
  currentTurn: 'home' | 'away';
  gameHistory: GameAction[];
  // Match state (multiple games)
  currentGame: number; // Current game number (1, 2, 3, ...)
  matchWins: { home: number; away: number }; // Wins per player
  matchHistory: Array<{ gameNumber: number; winner: 'home' | 'away' | null; startingTeam: 'home' | 'away'; gameHistory: GameAction[] }>; // History of completed games with their throws
  waitingForStartingTeam?: boolean; // If true, show starting team selection
  matchEnded?: boolean; // True when match is complete (someone reached required wins)
  // Store all game histories separately for undo across games
  allGameHistories: Array<{ gameNumber: number; history: GameAction[] }>; // Full history for each game
  // 1v1 specific tracking fields (from bpongcl)
  round: number;
  throwsNumberInRound: number;
  cupsRemaining: { home: number; away: number };
  cupsHitted: { home: number; away: number };
  gameEnded?: boolean;
}

interface GameAction {
  type: 'hit' | 'miss';
  playerId: string;
  team: 'home' | 'away';
  timestamp: number;
  // 1v1 specific fields (from bpongcl)
  match_number: number;
  round: number;
  throwsNumberInRound: number;
  cups_remaining: number;
  cups_hitted: number;
}

interface ThrowRecord {
  id: string;
  timestamp: string;
  team: 'home' | 'away';
  playerName: string;
  made: boolean;
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

export function ThrowTracker1v1({ homePlayer, awayPlayer, matchId, bestOf = 1, matchStatus, initialGameState, onStateChange, className }: ThrowTracker1v1Props) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    homeScore: 0,
    awayScore: 0,
    currentTurn: 'home',
    gameHistory: [],
    currentGame: 1,
    matchWins: { home: 0, away: 0 },
    matchHistory: [],
    waitingForStartingTeam: true,
    matchEnded: false,
    allGameHistories: [],
    round: 1,
    throwsNumberInRound: 0,
    cupsRemaining: { home: 10, away: 10 },
    cupsHitted: { home: 0, away: 0 },
    gameEnded: false,
  });

  // Calculate wins needed
  const winsNeeded = Math.ceil(bestOf / 2);

  const localStorageKey = matchId ? `match-1v1-${matchId}` : null;

  // Load from localStorage
  const loadFromLocalStorage = useCallback(() => {
    // Don't load from localStorage if match is finished - should load from DB instead
    if (matchStatus === 'finished') {
      return false;
    }
    if (!localStorageKey) return false;
    try {
      const savedData = localStorage.getItem(localStorageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        const isDataValid = Date.now() - parsedData.timestamp < 24 * 60 * 60 * 1000;
        if (isDataValid) {
          const loadedState = parsedData.gameState;
          setGameState({
            ...loadedState,
            matchWins: loadedState.matchWins || { home: 0, away: 0 },
            matchHistory: loadedState.matchHistory || [],
            currentGame: loadedState.currentGame || 1,
            waitingForStartingTeam: loadedState.waitingForStartingTeam ?? (loadedState.gameHistory?.length === 0),
            matchEnded: loadedState.matchEnded || false,
            allGameHistories: loadedState.allGameHistories || [],
            round: loadedState.round || 1,
            throwsNumberInRound: loadedState.throwsNumberInRound || 0,
            cupsRemaining: loadedState.cupsRemaining || { home: 10, away: 10 },
            cupsHitted: loadedState.cupsHitted || { home: 0, away: 0 },
            gameEnded: loadedState.gameEnded || false,
          });
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
  }, [localStorageKey, matchStatus]);

  // Save to localStorage
  const saveToLocalStorage = useCallback(() => {
    // Don't save to localStorage if match is finished
    if (matchStatus === 'finished') {
      return;
    }
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
  }, [gameState, localStorageKey, matchStatus]);

  // Load on mount - only once
  useEffect(() => {
    if (isInitialized) return;
    
    // If match is finished and we have initial game state from DB, use that
    if (matchStatus === 'finished' && initialGameState) {
      setGameState({
        ...initialGameState,
        matchWins: initialGameState.matchWins || { home: 0, away: 0 },
        matchHistory: initialGameState.matchHistory || [],
        currentGame: initialGameState.currentGame || 1,
        waitingForStartingTeam: false, // Finished matches don't need starting team selection
        matchEnded: initialGameState.matchEnded || false,
        allGameHistories: initialGameState.allGameHistories || [],
        round: initialGameState.round || 1,
        throwsNumberInRound: initialGameState.throwsNumberInRound || 0,
        cupsRemaining: initialGameState.cupsRemaining || { home: 10, away: 10 },
        cupsHitted: initialGameState.cupsHitted || { home: 0, away: 0 },
        gameEnded: initialGameState.gameEnded || false,
      });
      setIsInitialized(true);
      return;
    }
    
    const wasLoaded = loadFromLocalStorage();
    if (!wasLoaded) {
      setGameState(prev => ({
        ...prev,
        waitingForStartingTeam: true,
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

  // Helper functions from bpongcl tracker logic
  const getLastShot = (): GameAction | null => {
    return gameState.gameHistory.length > 0 ? gameState.gameHistory[gameState.gameHistory.length - 1] : null;
  };

  const getCupsHit = (side: 'home' | 'away', matchNumber: number): number => {
    return gameState.gameHistory.filter(t => t.match_number === matchNumber && t.type === 'hit' && t.team === side).length;
  };

  const getCupsMiss = (side: 'home' | 'away', matchNumber: number): number => {
    return gameState.gameHistory.filter(t => t.match_number === matchNumber && t.type === 'miss' && t.team === side).length;
  };

  const whoFinished = (matchNumber: number): 'home' | 'away' | null => {
    if (gameState.gameHistory.length === 0) return null;

    const thisMatch = gameState.gameHistory.filter(t => t.match_number === matchNumber);
    const playerOneHits = getCupsHit('home', matchNumber);
    const playerTwoHits = getCupsHit('away', matchNumber);

    if (thisMatch.length < 15 || playerOneHits === playerTwoHits) return null;

    const playerOneRemainingCups = (playerOneHits - 10) % 3;
    const playerTwoRemainingCups = (playerTwoHits - 10) % 3;

    if (playerOneHits > playerTwoHits && (playerOneHits === 10 || (playerOneHits > 10 && playerOneRemainingCups === 0))) {
      return 'home';
    } else if (playerOneHits < playerTwoHits && (playerTwoHits === 10 || (playerTwoHits > 10 && playerTwoRemainingCups === 0))) {
      return 'away';
    } else {
      return null;
    }
  };

  const isMatchEnded = (matchNumber: number): boolean => {
    const lastShot = getLastShot();
    if (lastShot === null) return false;

    if (lastShot.match_number === matchNumber && lastShot.type !== 'miss') return false;

    const finishedPlayer = whoFinished(matchNumber);
    if (finishedPlayer === null) return false;

    const thisMatchLogs = gameState.gameHistory.filter(t => t.match_number === matchNumber);
    if (thisMatchLogs.length < 15 || thisMatchLogs[thisMatchLogs.length - 1].type !== 'miss') return false;

    let index = thisMatchLogs.length - 1;
    while (index >= 0 && (thisMatchLogs[index].type !== 'hit' || thisMatchLogs[index].cups_remaining !== 0)) {
      index--;
    }

    if (index === -1) return false;

    const finishedShot = thisMatchLogs[index];
    if (finishedShot.cups_hitted < 10) return false;

    const remainingCups = (finishedShot.cups_hitted - 10) % 3;

    if (finishedShot.cups_hitted === 10 || remainingCups === 0) {
      if (gameState.gameHistory[gameState.gameHistory.length - 1] === finishedShot) return false;

      const revengeShots = gameState.gameHistory.filter(t => t.round === (finishedShot.round + 1) && t.match_number === finishedShot.match_number);
      const revengeShotMisses = revengeShots.filter(t => t.type === 'miss').length;

      if (revengeShotMisses === 0 || (finishedShot.throwsNumberInRound > 1 && revengeShotMisses === 1 && revengeShots[0].cups_remaining === 1 && revengeShots[0].type === 'miss')) {
        return false;
      } else {
        return true;
      }
    }
    return false;
  };

  const getMatchNumber = (): number => {
    const lastShot = getLastShot();
    if (lastShot === null) return 1;
    return isMatchEnded(lastShot.match_number) ? lastShot.match_number + 1 : lastShot.match_number;
  };

  const getRound = (): number => {
    const lastShot = getLastShot();
    if (lastShot === null || (lastShot !== null && isMatchEnded(lastShot.match_number))) return 1;
    return playersTurn() === lastShot.team ? lastShot.round : lastShot.round + 1;
  };

  const howManyRevengeShots = (): number => {
    const lastShot = getLastShot();
    if (lastShot === null) return 0;

    const finishedPlayer = whoFinished(lastShot.match_number);
    if (finishedPlayer !== null) {
      const lastShotinMatch = gameState.gameHistory.findLast(t => t.match_number === lastShot.match_number && t.team === finishedPlayer);
      if (lastShotinMatch === undefined) return 0;
      return lastShotinMatch.throwsNumberInRound === 3 ? 2 : lastShotinMatch.throwsNumberInRound;
    } else {
      return 0;
    }
  };

  const getNumberOfThrowInRound = (): number => {
    const lastShot = getLastShot();
    if (lastShot === null) return 1;

    const player = playersTurn();
    return lastShot.team === player ? lastShot.throwsNumberInRound + 1 : 1;
  };

  const remainingCups = (side: 'home' | 'away'): number => {
    if (gameState.gameHistory.length === 0) return 10;

    const lastThrowOfPlayer = gameState.gameHistory.findLast(t => t.team === side);
    if (lastThrowOfPlayer === undefined) return 10;

    if (lastThrowOfPlayer.match_number !== gameState.gameHistory[gameState.gameHistory.length - 1].match_number) return 10;
    if (isMatchEnded(gameState.gameHistory[gameState.gameHistory.length - 1].match_number)) return 10;

    const playersHits = lastThrowOfPlayer?.cups_hitted as number;
    const thisMatchNumber = gameState.gameHistory[gameState.gameHistory.length - 1].match_number;
    const finishedPlayer = whoFinished(thisMatchNumber);

    if (finishedPlayer === side) return 0;

    if (playersHits < 10) {
      return 10 - playersHits;
    } else {
      const otCups = playersHits - 10;
      const maxAvailable = Math.ceil(otCups / 3);
      const remaining = (maxAvailable * 3) - otCups;

      if (remaining === 0 && finishedPlayer === null) return 3;
      if (remaining === 0 && finishedPlayer === side) return remaining;
      if (remaining === 0 && finishedPlayer !== null) return 3;

      return remaining === 0 && finishedPlayer !== null && finishedPlayer === side ? remaining + 3 : remaining;
    }
  };

  const playersTurn = (): 'home' | 'away' => {
    if (isGameEnded()) return 'home';

    const lastShot = getLastShot();
    if (lastShot === null) return 'home';

    if (isMatchEnded(lastShot.match_number)) {
      return getMatchNumber() % 2 === 1 ? 'home' : 'away';
    }

    const lastRoundsShots = gameState.gameHistory.filter(t => t.round === lastShot.round && t.match_number === lastShot.match_number);

    if (lastShot.round === 1) {
      return lastShot.team === 'home' ? 'away' : 'home';
    }

    const lastShotsNumber = lastShot.throwsNumberInRound;
    const finishedPlayer = whoFinished(lastShot.match_number);
    const revengeShots = howManyRevengeShots();

    if (
      (finishedPlayer === null && lastShotsNumber === 1 && lastShot.cups_remaining > 0) ||
      (finishedPlayer === null && lastShotsNumber === 2 && lastShot.cups_remaining > 0 && lastRoundsShots[0].type === 'hit' && lastRoundsShots[1].type === 'hit') ||
      (finishedPlayer !== null && finishedPlayer !== lastShot.team && lastShot.type === 'hit' && lastShot.cups_remaining > 0) ||
      (finishedPlayer !== null && finishedPlayer !== lastShot.team && lastRoundsShots[0].cups_remaining === 1 && revengeShots === 2)
    ) {
      return lastShot.team;
    } else {
      return lastShot.team === 'home' ? 'away' : 'home';
    }
  };

  const matchWinner = (matchNumber: number): 'home' | 'away' | null => {
    if (isMatchEnded(matchNumber)) {
      const loser = gameState.gameHistory.findLast(t => t.match_number === matchNumber);
      return loser?.team === 'home' ? 'away' : 'home';
    } else {
      return null;
    }
  };

  const playerWins = (side: 'home' | 'away'): number => {
    const lastShot = getLastShot();
    if (lastShot === null) return 0;

    let result = 0;
    for (let index = 1; index <= lastShot.match_number; index++) {
      const winner = matchWinner(index);
      if (winner !== null && winner === side) {
        result = result + 1;
      }
    }
    return result;
  };

  const isGameEnded = (): boolean => {
    // For BO > 1, use matchWins from gameState (same as 2v2)
    if (bestOf > 1) {
      return gameState.matchWins.home >= winsNeeded || gameState.matchWins.away >= winsNeeded;
    }
    // For BO = 1, use the original playerWins logic (1v1 specific)
    return playerWins('home') === winsNeeded || playerWins('away') === winsNeeded;
  };

  // Handle starting team selection
  const handleSelectStartingTeam = (startingTeam: 'home' | 'away') => {
    setGameState(prev => {
      // Save starting team to match history if this is a new game
      const currentGameHistory = prev.matchHistory.find(g => g.gameNumber === prev.currentGame);
      const updatedMatchHistory = currentGameHistory 
        ? prev.matchHistory 
        : [
            ...prev.matchHistory,
            {
              gameNumber: prev.currentGame,
              winner: null,
              startingTeam,
              gameHistory: []
            }
          ];
      
      return {
        ...prev,
        waitingForStartingTeam: false,
        currentTurn: startingTeam,
        matchHistory: updatedMatchHistory
      };
    });
  };

  // Handle next match (start new game)
  const handleNextMatch = () => {
    setGameState(prev => {
      const nextGame = prev.currentGame + 1;
      const lastGame = prev.matchHistory[prev.matchHistory.length - 1];
      const nextStartingTeam = lastGame?.startingTeam === 'home' ? 'away' : 'home';
      
      const existingHistory = prev.allGameHistories?.find(g => g.gameNumber === prev.currentGame);
      
      let currentGameHistory: GameAction[] = [];
      if (existingHistory && existingHistory.history.length > 0) {
        currentGameHistory = existingHistory.history;
      } else if (prev.gameHistory.length > 0) {
        currentGameHistory = prev.gameHistory;
      } else if (prev.gameEnded) {
        const currentGameEntry = prev.matchHistory.find(g => g.gameNumber === prev.currentGame);
        if (currentGameEntry && currentGameEntry.gameHistory) {
          currentGameHistory = currentGameEntry.gameHistory;
        }
      }
      
      const updatedAllGameHistories = [
        ...(prev.allGameHistories || []).filter(g => g.gameNumber !== prev.currentGame),
        ...(currentGameHistory.length > 0 ? [{
          gameNumber: prev.currentGame,
          history: [...currentGameHistory]
        }] : [])
      ];
      
      return {
        ...prev,
        currentGame: nextGame,
        waitingForStartingTeam: true,
        homeScore: 0,
        awayScore: 0,
        currentTurn: nextStartingTeam,
        gameHistory: [],
        round: 1,
        throwsNumberInRound: 0,
        cupsRemaining: { home: 10, away: 10 },
        cupsHitted: { home: 0, away: 0 },
        gameEnded: false,
        allGameHistories: updatedAllGameHistories
      };
    });
  };

  const handleThrow = (type: 'hit' | 'miss', playerId: string) => {
    if (gameState.waitingForStartingTeam) return;
    if (gameState.matchEnded) return;
    if (gameState.gameEnded) return;

    // Use gameState.currentTurn directly instead of playersTurn() to ensure consistency
    const turn = gameState.currentTurn;
    const isHome = turn === 'home';
    
    // Verify that the correct player is throwing
    const expectedPlayerId = isHome ? homePlayer.id : awayPlayer.id;
    if (playerId !== expectedPlayerId) {
      console.warn(`Wrong player turn. Expected: ${expectedPlayerId}, Got: ${playerId}`);
      return;
    }
    
    const matchNumber = getMatchNumber();
    const round = getRound();
    const throwsNumberInRound = getNumberOfThrowInRound();
    const currentCupsRemaining = remainingCups(turn);
    const currentCupsHitted = getCupsHit(turn, matchNumber);
    
    const action: GameAction = {
      type,
      playerId,
      team: turn,
      timestamp: Date.now(),
      match_number: matchNumber,
      round,
      throwsNumberInRound,
      cups_remaining: currentCupsRemaining - (type === 'hit' ? 1 : 0),
      cups_hitted: currentCupsHitted + (type === 'hit' ? 1 : 0),
    };

    setGameState(prev => {
      const newHistory = [...prev.gameHistory, action];
      let newHomeScore = prev.homeScore;
      let newAwayScore = prev.awayScore;
      let newGameEnded = prev.gameEnded || false;
      let newCupsRemaining = { ...prev.cupsRemaining };
      let newCupsHitted = { ...prev.cupsHitted };

      // Update score
      if (type === 'hit') {
        if (isHome) {
          newHomeScore++;
          newCupsHitted.home++;
        } else {
          newAwayScore++;
          newCupsHitted.away++;
        }
      }

      // Update remaining cups
      if (isHome) {
        newCupsRemaining.home = action.cups_remaining;
      } else {
        newCupsRemaining.away = action.cups_remaining;
      }

      // Helper functions that use newHistory instead of gameState.gameHistory
      const getCupsHitForHistory = (side: 'home' | 'away', matchNum: number, history: GameAction[]): number => {
        return history.filter(t => t.match_number === matchNum && t.type === 'hit' && t.team === side).length;
      };

      const whoFinishedForHistory = (matchNum: number, history: GameAction[]): 'home' | 'away' | null => {
        if (history.length === 0) return null;
        const thisMatch = history.filter(t => t.match_number === matchNum);
        const playerOneHits = getCupsHitForHistory('home', matchNum, history);
        const playerTwoHits = getCupsHitForHistory('away', matchNum, history);
        if (thisMatch.length < 15 || playerOneHits === playerTwoHits) return null;
        const playerOneRemainingCups = (playerOneHits - 10) % 3;
        const playerTwoRemainingCups = (playerTwoHits - 10) % 3;
        if (playerOneHits > playerTwoHits && (playerOneHits === 10 || (playerOneHits > 10 && playerOneRemainingCups === 0))) {
          return 'home';
        } else if (playerOneHits < playerTwoHits && (playerTwoHits === 10 || (playerTwoHits > 10 && playerTwoRemainingCups === 0))) {
          return 'away';
        } else {
          return null;
        }
      };

      const howManyRevengeShotsForHistory = (history: GameAction[]): number => {
        if (history.length === 0) return 0;
        const lastShot = history[history.length - 1];
        const finishedPlayer = whoFinishedForHistory(lastShot.match_number, history);
        if (finishedPlayer !== null) {
          const lastShotinMatch = history.findLast(t => t.match_number === lastShot.match_number && t.team === finishedPlayer);
          if (lastShotinMatch === undefined) return 0;
          return lastShotinMatch.throwsNumberInRound === 3 ? 2 : lastShotinMatch.throwsNumberInRound;
        } else {
          return 0;
        }
      };

      // Helper function to check if match ended with new history (defined before use)
      const isMatchEndedForHistory = (matchNum: number, history: GameAction[]): boolean => {
        if (history.length === 0) return false;
        const lastShot = history[history.length - 1];
        if (lastShot.match_number === matchNum && lastShot.type !== 'miss') return false;
        const finishedPlayer = whoFinishedForHistory(matchNum, history);
        if (finishedPlayer === null) return false;
        const thisMatchLogs = history.filter(t => t.match_number === matchNum);
        if (thisMatchLogs.length < 15 || thisMatchLogs[thisMatchLogs.length - 1].type !== 'miss') return false;
        let index = thisMatchLogs.length - 1;
        while (index >= 0 && (thisMatchLogs[index].type !== 'hit' || thisMatchLogs[index].cups_remaining !== 0)) {
          index--;
        }
        if (index === -1) return false;
        const finishedShot = thisMatchLogs[index];
        if (finishedShot.cups_hitted < 10) return false;
        const remainingCups = (finishedShot.cups_hitted - 10) % 3;
        if (finishedShot.cups_hitted === 10 || remainingCups === 0) {
          if (history[history.length - 1] === finishedShot) return false;
          const revengeShots = history.filter(t => t.round === (finishedShot.round + 1) && t.match_number === finishedShot.match_number);
          const revengeShotMisses = revengeShots.filter(t => t.type === 'miss').length;
          if (revengeShotMisses === 0 || (finishedShot.throwsNumberInRound > 1 && revengeShotMisses === 1 && revengeShots[0].cups_remaining === 1 && revengeShots[0].type === 'miss')) {
            return false;
          } else {
            return true;
          }
        }
        return false;
      };

      // Calculate next turn based on new history
      let newCurrentTurn: 'home' | 'away' = turn;
      
      // Check if match ended with new history
      const matchEnded = isMatchEndedForHistory(matchNumber, newHistory);
      if (matchEnded && !prev.gameEnded) {
        newGameEnded = true;
        // If match ended, next turn is determined by match number
        newCurrentTurn = matchNumber % 2 === 1 ? 'home' : 'away';
      } else {
        // Calculate next turn based on game rules
        const lastShot = action;
        const lastRoundsShots = newHistory.filter(t => t.round === lastShot.round && t.match_number === lastShot.match_number);
        const finishedPlayer = whoFinishedForHistory(matchNumber, newHistory);
        const revengeShots = howManyRevengeShotsForHistory(newHistory);

        if (lastShot.round === 1) {
          newCurrentTurn = lastShot.team === 'home' ? 'away' : 'home';
        } else if (
          (finishedPlayer === null && lastShot.throwsNumberInRound === 1 && lastShot.cups_remaining > 0) ||
          (finishedPlayer === null && lastShot.throwsNumberInRound === 2 && lastShot.cups_remaining > 0 && lastRoundsShots[0].type === 'hit' && lastRoundsShots[1].type === 'hit') ||
          (finishedPlayer !== null && finishedPlayer !== lastShot.team && lastShot.type === 'hit' && lastShot.cups_remaining > 0) ||
          (finishedPlayer !== null && finishedPlayer !== lastShot.team && lastRoundsShots[0]?.cups_remaining === 1 && revengeShots === 2)
        ) {
          newCurrentTurn = lastShot.team;
        } else {
          newCurrentTurn = lastShot.team === 'home' ? 'away' : 'home';
        }
      }

      const matchWinnerForHistory = (matchNum: number, history: GameAction[]): 'home' | 'away' | null => {
        if (isMatchEndedForHistory(matchNum, history)) {
          const loser = history.findLast(t => t.match_number === matchNum);
          return loser?.team === 'home' ? 'away' : 'home';
        } else {
          return null;
        }
      };

      // Check for game win and update match wins
      let updatedMatchWins = prev.matchWins;
      let updatedMatchHistory = prev.matchHistory;
      let updatedMatchEnded = prev.matchEnded;
      
      const matchEndedWithNewHistory = matchEnded;
      if (matchEndedWithNewHistory && !prev.gameEnded) {
        newGameEnded = true;
        const winner = matchWinnerForHistory(matchNumber, newHistory);
        
        if (winner) {
          updatedMatchWins = {
            home: winner === 'home' ? prev.matchWins.home + 1 : prev.matchWins.home,
            away: winner === 'away' ? prev.matchWins.away + 1 : prev.matchWins.away
          };
          
          const lastGame = prev.matchHistory.find(g => g.gameNumber === prev.currentGame);
          updatedMatchHistory = [
            ...prev.matchHistory.filter(g => g.gameNumber !== prev.currentGame),
            {
              gameNumber: prev.currentGame,
              winner,
              startingTeam: lastGame?.startingTeam || prev.currentTurn,
              gameHistory: [...newHistory]
            }
          ];
          
          if (updatedMatchWins.home >= winsNeeded || updatedMatchWins.away >= winsNeeded) {
            updatedMatchEnded = true;
          }
        }
      }

      // Save current game history to allGameHistories when game ends
      let updatedAllGameHistories = prev.allGameHistories || [];
      if (matchEnded && !prev.gameEnded) {
        updatedAllGameHistories = [
          ...updatedAllGameHistories.filter(g => g.gameNumber !== prev.currentGame),
          {
            gameNumber: prev.currentGame,
            history: [...newHistory]
          }
        ];
      }

      return {
        ...prev,
        homeScore: newHomeScore,
        awayScore: newAwayScore,
        currentTurn: newCurrentTurn,
        gameHistory: newHistory,
        gameEnded: newGameEnded,
        matchWins: updatedMatchWins,
        matchHistory: updatedMatchHistory,
        matchEnded: updatedMatchEnded,
        allGameHistories: updatedAllGameHistories,
        round,
        throwsNumberInRound,
        cupsRemaining: newCupsRemaining,
        cupsHitted: newCupsHitted,
      };
    });
  };

  // Helper function to calculate turn from history
  const calculateTurnFromHistory = (history: GameAction[]): 'home' | 'away' => {
    if (history.length === 0) {
      // If no history, check if we have a starting team in match history
      const currentGameEntry = gameState.matchHistory.find(g => g.gameNumber === gameState.currentGame);
      return currentGameEntry?.startingTeam || 'home';
    }

    const lastShot = history[history.length - 1];
    const matchNumber = lastShot.match_number;

    // Helper functions for history-based calculations
    const getCupsHitForHistory = (side: 'home' | 'away', matchNum: number, hist: GameAction[]): number => {
      return hist.filter(t => t.match_number === matchNum && t.type === 'hit' && t.team === side).length;
    };

    const whoFinishedForHistory = (matchNum: number, hist: GameAction[]): 'home' | 'away' | null => {
      if (hist.length === 0) return null;
      const thisMatch = hist.filter(t => t.match_number === matchNum);
      const playerOneHits = getCupsHitForHistory('home', matchNum, hist);
      const playerTwoHits = getCupsHitForHistory('away', matchNum, hist);
      if (thisMatch.length < 15 || playerOneHits === playerTwoHits) return null;
      const playerOneRemainingCups = (playerOneHits - 10) % 3;
      const playerTwoRemainingCups = (playerTwoHits - 10) % 3;
      if (playerOneHits > playerTwoHits && (playerOneHits === 10 || (playerOneHits > 10 && playerOneRemainingCups === 0))) {
        return 'home';
      } else if (playerOneHits < playerTwoHits && (playerTwoHits === 10 || (playerTwoHits > 10 && playerTwoRemainingCups === 0))) {
        return 'away';
      } else {
        return null;
      }
    };

    const isMatchEndedForHistory = (matchNum: number, hist: GameAction[]): boolean => {
      if (hist.length === 0) return false;
      const lastShot = hist[hist.length - 1];
      if (lastShot.match_number === matchNum && lastShot.type !== 'miss') return false;
      const finishedPlayer = whoFinishedForHistory(matchNum, hist);
      if (finishedPlayer === null) return false;
      const thisMatchLogs = hist.filter(t => t.match_number === matchNum);
      if (thisMatchLogs.length < 15 || thisMatchLogs[thisMatchLogs.length - 1].type !== 'miss') return false;
      let index = thisMatchLogs.length - 1;
      while (index >= 0 && (thisMatchLogs[index].type !== 'hit' || thisMatchLogs[index].cups_remaining !== 0)) {
        index--;
      }
      if (index === -1) return false;
      const finishedShot = thisMatchLogs[index];
      if (finishedShot.cups_hitted < 10) return false;
      const remainingCups = (finishedShot.cups_hitted - 10) % 3;
      if (finishedShot.cups_hitted === 10 || remainingCups === 0) {
        if (hist[hist.length - 1] === finishedShot) return false;
        const revengeShots = hist.filter(t => t.round === (finishedShot.round + 1) && t.match_number === finishedShot.match_number);
        const revengeShotMisses = revengeShots.filter(t => t.type === 'miss').length;
        if (revengeShotMisses === 0 || (finishedShot.throwsNumberInRound > 1 && revengeShotMisses === 1 && revengeShots[0].cups_remaining === 1 && revengeShots[0].type === 'miss')) {
          return false;
        } else {
          return true;
        }
      }
      return false;
    };

    const howManyRevengeShotsForHistory = (hist: GameAction[]): number => {
      if (hist.length === 0) return 0;
      const lastShot = hist[hist.length - 1];
      const finishedPlayer = whoFinishedForHistory(lastShot.match_number, hist);
      if (finishedPlayer !== null) {
        const lastShotinMatch = hist.findLast(t => t.match_number === lastShot.match_number && t.team === finishedPlayer);
        if (lastShotinMatch === undefined) return 0;
        return lastShotinMatch.throwsNumberInRound === 3 ? 2 : lastShotinMatch.throwsNumberInRound;
      } else {
        return 0;
      }
    };

    // Check if match ended
    if (isMatchEndedForHistory(matchNumber, history)) {
      // If match ended, next turn is determined by match number
      return matchNumber % 2 === 1 ? 'home' : 'away';
    }

    // Calculate turn based on game rules
    const lastRoundsShots = history.filter(t => t.round === lastShot.round && t.match_number === lastShot.match_number);
    const finishedPlayer = whoFinishedForHistory(matchNumber, history);
    const revengeShots = howManyRevengeShotsForHistory(history);

    if (lastShot.round === 1) {
      return lastShot.team === 'home' ? 'away' : 'home';
    } else if (
      (finishedPlayer === null && lastShot.throwsNumberInRound === 1 && lastShot.cups_remaining > 0) ||
      (finishedPlayer === null && lastShot.throwsNumberInRound === 2 && lastShot.cups_remaining > 0 && lastRoundsShots[0].type === 'hit' && lastRoundsShots[1].type === 'hit') ||
      (finishedPlayer !== null && finishedPlayer !== lastShot.team && lastShot.type === 'hit' && lastShot.cups_remaining > 0) ||
      (finishedPlayer !== null && finishedPlayer !== lastShot.team && lastRoundsShots[0]?.cups_remaining === 1 && revengeShots === 2)
    ) {
      return lastShot.team;
    } else {
      return lastShot.team === 'home' ? 'away' : 'home';
    }
  };

  // Recompute from history for undo
  const recomputeFromHistory = (actions: GameAction[]): GameState => {
    let state: GameState = {
      ...gameState,
      homeScore: 0,
      awayScore: 0,
      currentTurn: 'home',
      gameHistory: [],
      round: 1,
      throwsNumberInRound: 0,
      cupsRemaining: { home: 10, away: 10 },
      cupsHitted: { home: 0, away: 0 },
      gameEnded: false,
      currentGame: gameState.currentGame || 1,
      matchWins: gameState.matchWins || { home: 0, away: 0 },
      matchHistory: gameState.matchHistory || [],
      waitingForStartingTeam: gameState.waitingForStartingTeam ?? true,
      matchEnded: false,
      allGameHistories: gameState.allGameHistories || [],
    };

    // Recompute state by replaying actions
    actions.forEach(action => {
      const isHome = action.team === 'home';
      if (action.type === 'hit') {
        if (isHome) {
          state.homeScore++;
          state.cupsHitted.home++;
        } else {
          state.awayScore++;
          state.cupsHitted.away++;
        }
      }
      state.cupsRemaining[action.team] = action.cups_remaining;
      state.gameHistory.push(action);
      state.round = action.round;
      state.throwsNumberInRound = action.throwsNumberInRound;
    });

    // Recalculate current turn from history
    state.currentTurn = calculateTurnFromHistory(actions);
    
    // Recalculate game ended
    const matchNumber = actions.length > 0 ? actions[actions.length - 1].match_number : gameState.currentGame;
    
    // Helper function to check if match ended
    const getCupsHitForHistory = (side: 'home' | 'away', matchNum: number, hist: GameAction[]): number => {
      return hist.filter(t => t.match_number === matchNum && t.type === 'hit' && t.team === side).length;
    };

    const whoFinishedForHistory = (matchNum: number, hist: GameAction[]): 'home' | 'away' | null => {
      if (hist.length === 0) return null;
      const thisMatch = hist.filter(t => t.match_number === matchNum);
      const playerOneHits = getCupsHitForHistory('home', matchNum, hist);
      const playerTwoHits = getCupsHitForHistory('away', matchNum, hist);
      if (thisMatch.length < 15 || playerOneHits === playerTwoHits) return null;
      const playerOneRemainingCups = (playerOneHits - 10) % 3;
      const playerTwoRemainingCups = (playerTwoHits - 10) % 3;
      if (playerOneHits > playerTwoHits && (playerOneHits === 10 || (playerOneHits > 10 && playerOneRemainingCups === 0))) {
        return 'home';
      } else if (playerOneHits < playerTwoHits && (playerTwoHits === 10 || (playerTwoHits > 10 && playerTwoRemainingCups === 0))) {
        return 'away';
      } else {
        return null;
      }
    };

    const isMatchEndedForHistory = (matchNum: number, hist: GameAction[]): boolean => {
      if (hist.length === 0) return false;
      const lastShot = hist[hist.length - 1];
      if (lastShot.match_number === matchNum && lastShot.type !== 'miss') return false;
      const finishedPlayer = whoFinishedForHistory(matchNum, hist);
      if (finishedPlayer === null) return false;
      const thisMatchLogs = hist.filter(t => t.match_number === matchNum);
      if (thisMatchLogs.length < 15 || thisMatchLogs[thisMatchLogs.length - 1].type !== 'miss') return false;
      let index = thisMatchLogs.length - 1;
      while (index >= 0 && (thisMatchLogs[index].type !== 'hit' || thisMatchLogs[index].cups_remaining !== 0)) {
        index--;
      }
      if (index === -1) return false;
      const finishedShot = thisMatchLogs[index];
      if (finishedShot.cups_hitted < 10) return false;
      const remainingCups = (finishedShot.cups_hitted - 10) % 3;
      if (finishedShot.cups_hitted === 10 || remainingCups === 0) {
        if (hist[hist.length - 1] === finishedShot) return false;
        const revengeShots = hist.filter(t => t.round === (finishedShot.round + 1) && t.match_number === finishedShot.match_number);
        const revengeShotMisses = revengeShots.filter(t => t.type === 'miss').length;
        if (revengeShotMisses === 0 || (finishedShot.throwsNumberInRound > 1 && revengeShotMisses === 1 && revengeShots[0].cups_remaining === 1 && revengeShots[0].type === 'miss')) {
          return false;
        } else {
          return true;
        }
      }
      return false;
    };

    state.gameEnded = isMatchEndedForHistory(matchNumber, actions);

    return state;
  };

  const undoLastAction = () => {
    setGameState(prev => {
      // If current game has no history, go back to previous game
      if (prev.gameHistory.length === 0 && prev.currentGame > 1) {
        const previousGameNumber = prev.currentGame - 1;
        
        let previousGameHistory: GameAction[] | null = null;
        const previousGameFromAll = prev.allGameHistories?.find(g => g.gameNumber === previousGameNumber);
        if (previousGameFromAll && previousGameFromAll.history.length > 0) {
          previousGameHistory = previousGameFromAll.history;
        } else {
          const previousGameFromMatch = prev.matchHistory?.find(g => g.gameNumber === previousGameNumber);
          if (previousGameFromMatch && previousGameFromMatch.gameHistory && previousGameFromMatch.gameHistory.length > 0) {
            previousGameHistory = previousGameFromMatch.gameHistory;
          }
        }
        
        if (previousGameHistory && previousGameHistory.length > 0) {
          const previousHistory = previousGameHistory.slice(0, -1);
          const recomputed = recomputeFromHistory(previousHistory);
          
          let updatedMatchWins = prev.matchWins || { home: 0, away: 0 };
          let updatedMatchHistory = prev.matchHistory || [];
          const previousGameEntry = updatedMatchHistory.find(g => g.gameNumber === previousGameNumber);
          
          if (previousGameEntry && previousGameEntry.winner) {
            updatedMatchWins = {
              home: previousGameEntry.winner === 'home' ? Math.max(0, updatedMatchWins.home - 1) : updatedMatchWins.home,
              away: previousGameEntry.winner === 'away' ? Math.max(0, updatedMatchWins.away - 1) : updatedMatchWins.away,
            };
            updatedMatchHistory = updatedMatchHistory.map(g => 
              g.gameNumber === previousGameNumber 
                ? { ...g, winner: null, gameHistory: previousHistory }
                : g
            );
          }
          
          const updatedAllGameHistories = [
            ...(prev.allGameHistories || []).filter(g => g.gameNumber !== previousGameNumber),
            {
              gameNumber: previousGameNumber,
              history: previousHistory
            }
          ];
          
          const winsNeeded = Math.ceil(bestOf / 2);
          const updatedMatchEnded = updatedMatchWins.home >= winsNeeded || updatedMatchWins.away >= winsNeeded;
          
          return {
            ...recomputed,
            gameHistory: previousHistory,
            currentGame: previousGameNumber,
            matchWins: updatedMatchWins,
            matchHistory: updatedMatchHistory,
            matchEnded: updatedMatchEnded,
            allGameHistories: updatedAllGameHistories,
            gameEnded: false,
            waitingForStartingTeam: false,
          };
        }
        return prev;
      }
      
      // Normal undo within current game
      if (prev.gameHistory.length === 0) return prev;
      
      const newHistory = prev.gameHistory.slice(0, -1);
      const recomputed = recomputeFromHistory(newHistory);
      
      let updatedMatchWins = prev.matchWins || { home: 0, away: 0 };
      let updatedMatchHistory = prev.matchHistory || [];
      let updatedMatchEnded = false;
      let updatedAllGameHistories = prev.allGameHistories || [];
      
      if (prev.gameEnded && !recomputed.gameEnded) {
        const lastGameEntry = updatedMatchHistory.find(g => g.gameNumber === prev.currentGame);
        if (lastGameEntry && lastGameEntry.winner) {
          updatedMatchWins = {
            home: lastGameEntry.winner === 'home' ? Math.max(0, updatedMatchWins.home - 1) : updatedMatchWins.home,
            away: lastGameEntry.winner === 'away' ? Math.max(0, updatedMatchWins.away - 1) : updatedMatchWins.away,
          };
          updatedMatchHistory = updatedMatchHistory.map(g => 
            g.gameNumber === prev.currentGame && g.winner
              ? { ...g, winner: null }
              : g
          );
          
          updatedAllGameHistories = updatedAllGameHistories.map(g =>
            g.gameNumber === prev.currentGame
              ? { ...g, history: newHistory }
              : g
          );
        }
      } else {
        updatedAllGameHistories = prev.allGameHistories.map(g =>
          g.gameNumber === prev.currentGame
            ? { ...g, history: newHistory }
            : g
        );
      }
      
      const winsNeeded = Math.ceil(bestOf / 2);
      updatedMatchEnded = updatedMatchWins.home >= winsNeeded || updatedMatchWins.away >= winsNeeded;
      
      return { 
        ...recomputed, 
        gameHistory: newHistory,
        matchWins: updatedMatchWins,
        matchHistory: updatedMatchHistory,
        matchEnded: updatedMatchEnded,
        allGameHistories: updatedAllGameHistories,
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
        {(gameState.gameHistory.length > 0 || (gameState.currentGame > 1 && (gameState.allGameHistories?.some(g => g.gameNumber === gameState.currentGame - 1 && g.history.length > 0) || gameState.matchHistory?.some(g => g.gameNumber === gameState.currentGame - 1)))) && (
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

      {/* Match wins display */}
      {bestOf > 1 && (
        <div className="mb-4 text-center">
          <div className="text-white/90 text-lg font-semibold mb-1">
            Match: {(gameState.matchWins?.home ?? 0)} - {(gameState.matchWins?.away ?? 0)} (Best of {bestOf})
          </div>
          <div className="text-white/60 text-xs">
            Game {gameState.currentGame || 1} - {winsNeeded} {winsNeeded === 1 ? 'win' : 'wins'} needed
          </div>
        </div>
      )}

      {/* Match ended message */}
      {gameState.matchEnded && (
        <div className="mb-4 p-4 bg-[#ff073a]/20 border border-[#ff073a]/50 rounded-lg text-center">
          <div className="text-white text-xl font-bold mb-2">
            Match Complete!
          </div>
          <div className="text-white/90 text-lg">
            {(gameState.matchWins?.home ?? 0) > (gameState.matchWins?.away ?? 0) ? homePlayer.label : awayPlayer.label} wins the match!
          </div>
        </div>
      )}

      {/* Starting team selection */}
      {gameState.waitingForStartingTeam && !gameState.matchEnded && (
        <div className="mb-6 p-6 bg-white/5 border border-white/20 rounded-lg">
          <div className="text-white text-center mb-4 text-lg font-semibold">
            Game {gameState.currentGame} - Select Starting Player
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => handleSelectStartingTeam('home')}
              className="flex-1 bg-gradient-to-r from-[#ff073a] to-[#ff1744] text-white hover:from-[#ff1744] hover:to-[#ff4569] py-6 text-lg font-bold"
            >
              {homePlayer.label} Starts
            </Button>
            <Button
              onClick={() => handleSelectStartingTeam('away')}
              className="flex-1 bg-gradient-to-r from-[#ff073a] to-[#ff1744] text-white hover:from-[#ff1744] hover:to-[#ff4569] py-6 text-lg font-bold"
            >
              {awayPlayer.label} Starts
            </Button>
          </div>
        </div>
      )}

      {/* Next Match button */}
      {gameState.gameEnded && !gameState.matchEnded && bestOf > 1 && (
        <div className="mb-6 p-4 bg-white/5 border border-white/20 rounded-lg text-center">
          <div className="text-white mb-3">
            Game {gameState.currentGame} Complete!
            {gameState.matchHistory.length > 0 && (
              <span className="ml-2 text-white/70">
                ({gameState.matchHistory[gameState.matchHistory.length - 1]?.winner === 'home' ? homePlayer.label : awayPlayer.label} won)
              </span>
            )}
          </div>
          <Button
            onClick={handleNextMatch}
            className="bg-gradient-to-r from-[#ff073a] to-[#ff1744] text-white hover:from-[#ff1744] hover:to-[#ff4569] px-8 py-3 text-lg font-bold"
          >
            Next Match
          </Button>
        </div>
      )}

      {/* Score display */}
      {!gameState.waitingForStartingTeam && !gameState.matchEnded && (
        <div className="mb-4 text-center">
          <div className="text-white/70 text-sm">
            Home: {gameState.homeScore} - Away: {gameState.awayScore}
          </div>
          <div className="text-white/50 text-xs mt-1">
            {currentPlayer.label}'s turn (Round {gameState.round}, Throw {gameState.throwsNumberInRound})
          </div>
          <div className="text-white/40 text-xs mt-1">
            Remaining: {gameState.cupsRemaining[gameState.currentTurn]} cups
          </div>
        </div>
      )}

      {/* Player buttons */}
      {!gameState.waitingForStartingTeam && !gameState.gameEnded && !gameState.matchEnded && (
        <div className="flex flex-col md:flex-row md:justify-between items-stretch md:items-start mb-6 gap-4">
          {/* Left side - GREEN button (for hits) */}
          <div className="flex flex-col gap-3 flex-1">
            <Button
              onClick={() => handleThrow('hit', currentPlayer.id)}
              disabled={false}
              className="w-full text-2xl md:text-3xl font-bold py-12 md:py-16 transition-all bg-green-500 border-2 border-green-400 text-white shadow-lg shadow-green-500/50 hover:bg-green-600 hover:shadow-green-500/70 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentPlayer.label} - HIT
            </Button>
          </div>
          
          {/* Right side - RED button (for misses) */}
          <div className="flex flex-col gap-3 flex-1">
            <Button
              onClick={() => handleThrow('miss', currentPlayer.id)}
              disabled={false}
              className="w-full text-2xl md:text-3xl font-bold py-12 md:py-16 transition-all bg-red-500 border-2 border-red-400 text-white shadow-lg shadow-red-500/50 hover:bg-red-600 hover:shadow-red-500/70 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentPlayer.label} - MISS
            </Button>
          </div>
        </div>
      )}
      
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
