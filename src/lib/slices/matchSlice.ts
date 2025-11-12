import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../../elysia/client';
import { DatabaseMatch } from '@/types/match';

interface CreateMatchPayload {
  eventId: string;
  type: '1on1' | '2on2';
  dateTime: string;
  bestOf?: number; // Best Of number (defaults to 1)
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
}

type Match = DatabaseMatch;

interface MatchState {
  matches: Match[];
  isLoading: boolean;
  error: string | null;
}

const initialState: MatchState = {
  matches: [],
  isLoading: false,
  error: null,
};

export const createMatch = createAsyncThunk(
  'match/createMatch',
  async (payload: CreateMatchPayload, { rejectWithValue }) => {
    try {
      const result = await (api as any).match.create.post(payload);
      if (result.data && !result.data.success) {
        return rejectWithValue(result.data.error || 'Failed to create match');
      }
      // Convert date fields to ISO strings for serialization
      const match = result.data?.data;
      if (match) {
        return {
          ...match,
          date: match.date instanceof Date ? match.date.toISOString() : match.date,
          createdAt: match.createdAt instanceof Date ? match.createdAt.toISOString() : match.createdAt,
          updatedAt: match.updatedAt instanceof Date ? match.updatedAt.toISOString() : match.updatedAt,
        };
      }
      return match;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create match');
    }
  }
);

export const fetchMatches = createAsyncThunk(
  'match/fetchMatches',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const result = await (api as any).match.list.get({ query: { eventId } });
      if (result.data && !result.data.success) {
        return rejectWithValue(result.data.error || 'Failed to fetch matches');
      }
      // Convert date fields to ISO strings for serialization
      const matches = (result.data?.data || []).map((match: any) => ({
        ...match,
        date: match.date instanceof Date ? match.date.toISOString() : match.date,
        createdAt: match.createdAt instanceof Date ? match.createdAt.toISOString() : match.createdAt,
        updatedAt: match.updatedAt instanceof Date ? match.updatedAt.toISOString() : match.updatedAt,
      }));
      return { eventId, matches };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch matches');
    }
  }
);

const matchSlice = createSlice({
  name: 'match',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearMatches: (state) => {
      state.matches = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Create match
      .addCase(createMatch.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createMatch.fulfilled, (state, action: PayloadAction<Match>) => {
        state.isLoading = false;
        // Date fields are already strings from the thunk
        state.matches.push(action.payload);
      })
      .addCase(createMatch.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch matches
      .addCase(fetchMatches.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMatches.fulfilled, (state, action: PayloadAction<{ eventId: string; matches: Match[] }>) => {
        state.isLoading = false;
        // Remove existing matches for this event and add new ones
        // Date fields are already strings from the thunk
        state.matches = state.matches.filter(m => m.eventId !== action.payload.eventId);
        state.matches.push(...action.payload.matches);
      })
      .addCase(fetchMatches.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch single match
      .addCase(fetchMatch.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMatch.fulfilled, (state, action: PayloadAction<Match>) => {
        state.isLoading = false;
        // Update match in list or add if not present
        const index = state.matches.findIndex(m => m.id === action.payload.id);
        if (index >= 0) {
          state.matches[index] = action.payload;
        } else {
          state.matches.push(action.payload);
        }
      })
      .addCase(fetchMatch.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Start match
      .addCase(startMatch.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startMatch.fulfilled, (state, action: PayloadAction<Match>) => {
        state.isLoading = false;
        // Update match in list
        const index = state.matches?.findIndex(m => m.id === action?.payload?.id);
        if (index >= 0) {
          state.matches[index] = action.payload;
        }
      })
      .addCase(startMatch.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const fetchMatch = createAsyncThunk(
  'match/fetchMatch',
  async (matchId: string, { rejectWithValue }) => {
    try {
      const result = await (api as any).match[matchId].get();
      if (result.data && !result.data.success) {
        return rejectWithValue(result.data.error || 'Failed to fetch match');
      }
      // Convert date fields to ISO strings for serialization
      const match = result.data?.data;
      if (match) {
        return {
          ...match,
          date: match.date instanceof Date ? match.date.toISOString() : match.date,
          createdAt: match.createdAt instanceof Date ? match.createdAt.toISOString() : match.createdAt,
          updatedAt: match.updatedAt instanceof Date ? match.updatedAt.toISOString() : match.updatedAt,
        };
      }
      return match;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch match');
    }
  }
);

export const startMatch = createAsyncThunk(
  'match/startMatch',
  async (matchId: string, { rejectWithValue }) => {
    try {
      console.log('startMatch thunk called with matchId:', matchId);
      console.log('API call:', `api.match.start.post({ matchId: '${matchId}' })`);
      
      const result = await (api as any).match.start.post({ matchId });
      console.log('API result:', result);
      console.log('API result data:', result.data);
      
      if (result.data && !result.data.success) {
        console.error('API returned error:', result.data.error);
        return rejectWithValue(result.data.error || 'Failed to start match');
      }
      // Convert date fields to ISO strings for serialization
      const match = result.data?.data;
      console.log('Match data from API:', match);
      
      if (match) {
        const convertedMatch = {
          ...match,
          date: match.date instanceof Date ? match.date.toISOString() : match.date,
          createdAt: match.createdAt instanceof Date ? match.createdAt.toISOString() : match.createdAt,
          updatedAt: match.updatedAt instanceof Date ? match.updatedAt.toISOString() : match.updatedAt,
        };
        console.log('Converted match:', convertedMatch);
        return convertedMatch;
      }
      return match;
    } catch (error: any) {
      console.error('Error in startMatch thunk:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return rejectWithValue(error.message || 'Failed to start match');
    }
  }
);

export const syncTracking = createAsyncThunk(
  'match/syncTracking',
  async ({ matchId, trackingData }: { matchId: string; trackingData: any }, { rejectWithValue }) => {
    try {
      const result = await (api as any).match.tracking.sync.put({ matchId, trackingData });
      if (result.data && !result.data.success) {
        return rejectWithValue(result.data.error || 'Failed to sync tracking data');
      }
      return result.data?.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sync tracking data');
    }
  }
);

export const finishTracking = createAsyncThunk(
  'match/finishTracking',
  async ({ matchId, trackingData }: { matchId: string; trackingData?: any }, { rejectWithValue }) => {
    try {
      const result = await (api as any).match.tracking.finish.put({ matchId, ...(trackingData ? { trackingData } : {}) });
      if (result.data && !result.data.success) {
        return rejectWithValue(result.data.error || 'Failed to finish tracking');
      }
      // Convert date fields to ISO strings for serialization
      const match = result.data?.data;
      if (match) {
        return {
          ...match,
          date: match.date instanceof Date ? match.date.toISOString() : match.date,
          createdAt: match.createdAt instanceof Date ? match.createdAt.toISOString() : match.createdAt,
          updatedAt: match.updatedAt instanceof Date ? match.updatedAt.toISOString() : match.updatedAt,
        };
      }
      return match;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to finish tracking');
    }
  }
);

export const { clearError, clearMatches } = matchSlice.actions;
export default matchSlice.reducer;

