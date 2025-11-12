import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../../elysia/client';

interface CreateEventPayload {
  name: string;
  type: '1on1' | '2on2';
  dateTime: string;
  location?: string;
  showTwitchChat?: boolean;
  twitchChatApiKey?: string;
  layoutImage?: string;
}

interface Event {
  id: string;
  name: string;
  type: '1on1' | '2on2';
  date: string;
  location?: string;
  showTwitchChat: boolean;
  twitchChatApiKey?: string;
  layoutImage?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface EventState {
  events: Event[];
  isLoading: boolean;
  error: string | null;
}

const initialState: EventState = {
  events: [],
  isLoading: false,
  error: null,
};

export const createEvent = createAsyncThunk(
  'event/createEvent',
  async (payload: CreateEventPayload, { rejectWithValue }) => {
    try {
      const result = await (api as any).event.create.post(payload);
      if (result.data && !result.data.success) {
        return rejectWithValue(result.data.error || 'Failed to create event');
      }
      // Convert date fields to ISO strings for serialization
      const event = result.data?.data;
      if (event) {
        return {
          ...event,
          date: event.date instanceof Date ? event.date.toISOString() : event.date,
          createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
          updatedAt: event.updatedAt instanceof Date ? event.updatedAt.toISOString() : event.updatedAt,
        };
      }
      return event;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create event');
    }
  }
);

export const fetchEvents = createAsyncThunk(
  'event/fetchEvents',
  async (_, { rejectWithValue }) => {
    try {
      const result = await (api as any).event.list.get();
      if (result.data && !result.data.success) {
        return rejectWithValue(result.data.error || 'Failed to fetch events');
      }
      // Convert date fields to ISO strings for serialization
      const events = (result.data?.data || []).map((event: any) => ({
        ...event,
        date: event.date instanceof Date ? event.date.toISOString() : event.date,
        createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
        updatedAt: event.updatedAt instanceof Date ? event.updatedAt.toISOString() : event.updatedAt,
      }));
      return events;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch events');
    }
  }
);

export const fetchEvent = createAsyncThunk(
  'event/fetchEvent',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const result = await (api as any).event[eventId].get();
      if (result.data && !result.data.success) {
        return rejectWithValue(result.data.error || 'Failed to fetch event');
      }
      // Convert date fields to ISO strings for serialization
      const event = result.data?.data;
      if (event) {
        return {
          ...event,
          date: event.date instanceof Date ? event.date.toISOString() : event.date,
          createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
          updatedAt: event.updatedAt instanceof Date ? event.updatedAt.toISOString() : event.updatedAt,
        };
      }
      return event;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch event');
    }
  }
);

export const updateEvent = createAsyncThunk(
  'event/updateEvent',
  async (payload: { id: string; data: CreateEventPayload }, { rejectWithValue }) => {
    try {
      const result = await (api as any).event[payload.id].put(payload.data);
      if (result.data && !result.data.success) {
        return rejectWithValue(result.data.error || 'Failed to update event');
      }
      // Convert date fields to ISO strings for serialization
      const event = result.data?.data;
      if (event) {
        return {
          ...event,
          date: event.date instanceof Date ? event.date.toISOString() : event.date,
          createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
          updatedAt: event.updatedAt instanceof Date ? event.updatedAt.toISOString() : event.updatedAt,
        };
      }
      return event;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update event');
    }
  }
);

const eventSlice = createSlice({
  name: 'event',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create event
      .addCase(createEvent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createEvent.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        // Date fields are already strings from the thunk
        state.events.push(action.payload);
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch events
      .addCase(fetchEvents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action: PayloadAction<Event[]>) => {
        state.isLoading = false;
        state.events = action.payload;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch single event
      .addCase(fetchEvent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEvent.fulfilled, (state, action: PayloadAction<Event>) => {
        state.isLoading = false;
        // Update event in list or add if not present
        const index = state.events.findIndex(e => e.id === action.payload.id);
        if (index >= 0) {
          state.events[index] = action.payload;
        } else {
          state.events.push(action.payload);
        }
      })
      .addCase(fetchEvent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update event
      .addCase(updateEvent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateEvent.fulfilled, (state, action: PayloadAction<Event>) => {
        state.isLoading = false;
        // Update event in list
        const index = state.events.findIndex(e => e.id === action.payload.id);
        if (index >= 0) {
          state.events[index] = action.payload;
        }
      })
      .addCase(updateEvent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = eventSlice.actions;
export default eventSlice.reducer;

