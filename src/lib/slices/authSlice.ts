import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authClient, type Session } from '../auth-client';

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  session: null,
  isLoading: false,
  error: null,
};

// Async thunks for auth actions
export const fetchSession = createAsyncThunk(
  'auth/fetchSession',
  async () => {
    const { data } = await authClient.getSession();
    return data;
  }
);

export const signInEmail = createAsyncThunk(
  'auth/signInEmail',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        return rejectWithValue(result.error.message);
      }
      const { data } = await authClient.getSession();
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign in failed');
    }
  }
);

export const signUpEmail = createAsyncThunk(
  'auth/signUpEmail',
  async (
    { 
      email, 
      password, 
      name, 
      organizationName 
    }: { 
      email: string; 
      password: string; 
      name: string;
      organizationName: string;
    }, 
    { rejectWithValue }
  ) => {
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });
      
      if (result.error) {
        return rejectWithValue(result.error.message);
      }
      
      // Update user with organizationName after signup
      if (organizationName) {
        try {
          await authClient.updateUser({
            organizationName: organizationName as any, // Cast to any as it's an additionalField
          });
        } catch (updateError) {
          console.warn('Failed to update organizationName:', updateError);
          // Continue anyway - user is signed up
        }
      }
      
      const { data } = await authClient.getSession();
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign up failed');
    }
  }
);

export const signOutUser = createAsyncThunk(
  'auth/signOut',
  async () => {
    await authClient.signOut();
    return null;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch session
      .addCase(fetchSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.session = action.payload;
      })
      .addCase(fetchSession.rejected, (state, action) => {
        state.isLoading = false;
        state.session = null;
        state.error = action.error.message || 'Failed to fetch session';
      })
      // Sign in
      .addCase(signInEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.session = action.payload;
      })
      .addCase(signInEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Sign up
      .addCase(signUpEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUpEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.session = action.payload;
      })
      .addCase(signUpEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Sign out
      .addCase(signOutUser.fulfilled, (state) => {
        state.session = null;
        state.error = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;

