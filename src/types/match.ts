export type MatchType = "1on1" | "2on2";
export type MatchStatus = "not_started" | "live" | "finished";

// Tracking data structure for player statistics
export interface PlayerTrackingData {
  playerName: string;
  made: number; // Made throws
  attempted: number; // Total attempted throws
  percentage: number; // Success percentage
}

// Individual throw record
export interface ThrowRecord {
  id: string;
  timestamp: string; // ISO string
  team: 'home' | 'away';
  playerName: string;
  made: boolean; // true = hit (green), false = miss (red)
}

export interface TrackingData {
  home: PlayerTrackingData[];
  away: PlayerTrackingData[];
  throws?: ThrowRecord[]; // Optional: chronological list of throws
}

// Database match type (from API)
export interface DatabaseMatch {
  id: string;
  eventId: string;
  type: MatchType;
  status: MatchStatus;
  date: string;
  homePlayerName?: string | null;
  awayPlayerName?: string | null;
  homeTeamName?: string | null;
  homePlayer1Name?: string | null;
  homePlayer2Name?: string | null;
  awayTeamName?: string | null;
  awayPlayer1Name?: string | null;
  awayPlayer2Name?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  bestOf?: number | null; // Best Of number (e.g., 7 for BO7 = 4 wins needed)
  trackingData?: TrackingData | null;
  createdAt: string;
  updatedAt: string;
}

// UI match type (for components)
export interface Match {
  id: string;
  type: MatchType;
  status: MatchStatus;
  date: string;
  time: string;
  players: {
    team1: string[];
    team2: string[];
  };
  score?: {
    team1: number;
    team2: number;
  };
}

// Helper function to convert database match to UI match
export function convertMatch(dbMatch: DatabaseMatch): Match {
  const matchDate = new Date(dbMatch.date);
  const date = matchDate.toISOString().split('T')[0];
  const time = matchDate.toTimeString().split(' ')[0].slice(0, 5);

  let team1: string[] = [];
  let team2: string[] = [];

  if (dbMatch.type === '1on1') {
    team1 = dbMatch.homePlayerName ? [dbMatch.homePlayerName] : [];
    team2 = dbMatch.awayPlayerName ? [dbMatch.awayPlayerName] : [];
  } else {
    // 2v2
    const homePlayers = [
      dbMatch.homePlayer1Name,
      dbMatch.homePlayer2Name,
    ].filter(Boolean) as string[];
    const awayPlayers = [
      dbMatch.awayPlayer1Name,
      dbMatch.awayPlayer2Name,
    ].filter(Boolean) as string[];
    
    if (dbMatch.homeTeamName) {
      team1 = [dbMatch.homeTeamName, ...homePlayers];
    } else {
      team1 = homePlayers;
    }
    
    if (dbMatch.awayTeamName) {
      team2 = [dbMatch.awayTeamName, ...awayPlayers];
    } else {
      team2 = awayPlayers;
    }
  }

  return {
    id: dbMatch.id,
    type: dbMatch.type,
    status: dbMatch.status,
    date,
    time,
    players: {
      team1,
      team2,
    },
    score: dbMatch.homeScore !== null && dbMatch.awayScore !== null
      ? {
          team1: dbMatch.homeScore as number,
          team2: dbMatch.awayScore as number,
        }
      : undefined,
  };
}

export interface Event {
  id: string; // UUID
  name: string;
  description?: string;
  date: string;
  location?: string;
  type: '1on1' | '2on2';
  layoutImage?: string;
  showTwitchChat?: boolean;
  matches?: Match[];
}

