"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ThrowRecord } from "@/types/match";
import { Button } from "@/components/ui/button";

interface ThrowTrackerProps {
  throws: ThrowRecord[];
  homePlayers: string[];
  awayPlayers: string[];
  className?: string;
}

// Group throws into sets of 2-3 based on team
function groupThrows(throws: ThrowRecord[]): ThrowRecord[][] {
  if (throws.length === 0) return [];
  
  const groups: ThrowRecord[][] = [];
  let currentGroup: ThrowRecord[] = [];
  
  for (let i = 0; i < throws.length; i++) {
    const throwItem = throws[i];
    
    // If group is empty, start new group
    if (currentGroup.length === 0) {
      currentGroup.push(throwItem);
      continue;
    }
    
    const currentTeam = currentGroup[0].team;
    const nextThrow = i < throws.length - 1 ? throws[i + 1] : null;
    
    // Check if we should close current group:
    // 1. Team changed
    // 2. Group has 3 throws
    // 3. Group has 2 throws and next throw is different team
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
  
  // Add remaining throws
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

export function ThrowTracker({ throws, homePlayers, awayPlayers, className }: ThrowTrackerProps) {
  const groupedThrows = groupThrows(throws);
  
  // Determine which team is currently throwing (last throw determines next turn)
  // If last throw was home, next is away. If last throw was away (or no throws), next is home.
  const lastThrow = throws.length > 0 ? throws[throws.length - 1] : null;
  const lastThrowingTeam = lastThrow ? lastThrow.team : null;
  // Next team to throw: if last was home, next is away; otherwise next is home
  const isHomeThrowing = lastThrowingTeam !== 'home'; // If last wasn't home (or no throws), home throws next
  
  // Get the current throwing team's players
  const currentThrowingPlayers = isHomeThrowing ? homePlayers : awayPlayers;
  const player1 = currentThrowingPlayers[0] || 'Player 1';
  const player2 = currentThrowingPlayers[1] || (currentThrowingPlayers.length === 1 ? '' : 'Player 2');
  
  // All 4 buttons show the current throwing team's players
  
  return (
    <div className={cn("w-full bg-[#0a0a0a] border border-[#ff073a]/30 rounded-lg p-4 relative", className)}>
      {/* Center line - horizontal - full width across entire component */}
      <div 
        className="absolute left-0 right-0 h-0.5 bg-white/20 z-0 pointer-events-none" 
        style={{ 
          top: 'calc(100% - 280px / 2 - 60px)'
        }} 
      />
      
      <h3 className="text-lg font-semibold text-white mb-4 text-center">Throw Tracker</h3>
      
      {/* Player buttons - 4 buttons above tracker, all showing current throwing team's players */}
      {/* Mobile: 2 zöld egymás alatt, majd 2 piros egymás alatt */}
      {/* Desktop: Left side: green (hit), Right side: red (miss) */}
      <div className="flex flex-col md:flex-row md:justify-between items-stretch md:items-start mb-6 gap-4">
        {/* Left side - 2 buttons (GREEN - for hits) */}
        <div className="flex flex-col gap-3 flex-1">
          {player1 && (
            <Button
              className="w-full text-2xl md:text-3xl font-bold py-12 md:py-16 transition-all bg-green-500 border-2 border-green-400 text-white shadow-lg shadow-green-500/50 hover:bg-green-600 hover:shadow-green-500/70"
            >
              {player1}
            </Button>
          )}
          {player2 && (
            <Button
              className="w-full text-2xl md:text-3xl font-bold py-12 md:py-16 transition-all bg-green-500 border-2 border-green-400 text-white shadow-lg shadow-green-500/50 hover:bg-green-600 hover:shadow-green-500/70"
            >
              {player2}
            </Button>
          )}
        </div>
        
        {/* Right side - 2 buttons (RED - for misses) */}
        <div className="flex flex-col gap-3 flex-1">
          {player1 && (
            <Button
              className="w-full text-2xl md:text-3xl font-bold py-12 md:py-16 transition-all bg-red-500 border-2 border-red-400 text-white shadow-lg shadow-red-500/50 hover:bg-red-600 hover:shadow-red-500/70"
            >
              {player1}
            </Button>
          )}
          {player2 && (
            <Button
              className="w-full text-2xl md:text-3xl font-bold py-12 md:py-16 transition-all bg-red-500 border-2 border-red-400 text-white shadow-lg shadow-red-500/50 hover:bg-red-600 hover:shadow-red-500/70"
            >
              {player2}
            </Button>
          )}
        </div>
      </div>
      
      {/* Horizontal scrolling container - increased height */}
      <div className="relative overflow-x-auto overflow-y-visible" style={{ minHeight: '280px', paddingBottom: '60px', paddingTop: '60px' }}>
        
        <div className="flex items-center gap-6 min-w-max px-4" style={{ minHeight: '280px' }}>
          
          {groupedThrows.map((group, groupIndex) => {
            // Determine team for this group
            const groupTeam = group[0]?.team;
            const isHomeGroup = groupTeam === 'home';
            
            return (
              <div
                key={groupIndex}
                className="flex flex-col items-center gap-2 relative z-10"
                style={{ minHeight: '280px', justifyContent: 'center' }}
              >
                {/* Group container - positioned above or below the center line */}
                <div 
                  className="flex flex-col items-center gap-1.5"
                  style={{
                    // Physically position above or below the center line - increased distance
                    marginTop: isHomeGroup ? '-120px' : '0px',
                    marginBottom: isHomeGroup ? '0px' : '-120px',
                  }}
                >
                  {group.map((throwItem, throwIndex) => {
                    const isHome = throwItem.team === 'home';
                    const isMade = throwItem.made;
                    
                    // Find the index of this throw in the full throws array
                    const throwIndexInFullArray = throws.findIndex(t => t.id === throwItem.id);
                    const score = calculateScoreUpTo(throws, throwIndexInFullArray);
                    
                    // Player name - use mock data if not available
                    const playerName = throwItem.playerName || (isHome ? homePlayers[0] || 'Home Player' : awayPlayers[0] || 'Away Player');
                    
                    // Score text
                    const scoreText = `${score.home}-${score.away}`;
                    
                    return (
                      <motion.div
                        key={throwItem.id}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ 
                          delay: throwIndex * 0.1,
                          type: "spring",
                          stiffness: 300,
                          damping: 20
                        }}
                        className="flex flex-col items-center gap-1"
                      >
                        {/* Text above (for home/above) or below (for away/below) */}
                        {isHome ? (
                          <div className="text-center mb-1">
                            <div className="text-white/70 text-xs leading-tight">{playerName}</div>
                            <div className="text-white/60 text-xs">{scoreText}</div>
                          </div>
                        ) : null}
                        
                        {/* Icon */}
                        <div
                          className={cn(
                            "w-12 h-12 rounded-full border-2 flex items-center justify-center relative transition-all hover:scale-110 cursor-pointer",
                            isMade 
                              ? "bg-green-500 border-green-400 shadow-lg shadow-green-500/50" 
                              : "bg-red-500 border-red-400 shadow-lg shadow-red-500/50"
                          )}
                        >
                          {/* Arrow indicator pointing to center line */}
                          {/* Home (fent): nyíl lefelé mutat a vonal felé, Away (lent): nyíl felfelé mutat a vonal felé */}
                          <div
                            className={cn(
                              "absolute w-0 h-0 border-l-[10px] border-r-[10px] border-l-transparent border-r-transparent",
                              isHome 
                                ? "top-full mt-2 border-t-[12px] border-t-white/40" // Home: fent van, nyíl lefelé mutat
                                : "bottom-full mb-2 border-b-[12px] border-b-white/40" // Away: lent van, nyíl felfelé mutat
                            )}
                          />
                          {/* Success/X indicator */}
                          <span className="text-white text-sm font-bold">
                            {isMade ? '✓' : '✗'}
                          </span>
                        </div>
                        
                        {/* Text below (for away/below) */}
                        {!isHome ? (
                          <div className="text-center mt-1">
                            <div className="text-white/70 text-xs leading-tight">{playerName}</div>
                            <div className="text-white/60 text-xs">{scoreText}</div>
                          </div>
                        ) : null}
                      </motion.div>
                    );
                  })}
                </div>
                
                {/* Group separator line - vertical */}
                {groupIndex < groupedThrows.length - 1 && (
                  <div className="absolute right-[-12px] top-1/2 w-px h-24 bg-white/10 -translate-y-1/2" />
                )}
              </div>
            );
          })}
          
          {/* Empty state */}
          {groupedThrows.length === 0 && (
            <div className="flex items-center justify-center w-full py-8">
              <p className="text-white/50 text-sm">No throws recorded yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

