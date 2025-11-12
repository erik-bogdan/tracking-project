import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const matchApi = createApi({
  reducerPath: 'matchApi',
  baseQuery: fetchBaseQuery({
    baseUrl: typeof window !== 'undefined' 
      ? `${window.location.origin}/api`
      : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/api',
    credentials: 'include',
  }),
  tagTypes: ['Match'],
  endpoints: (builder) => ({
    syncTracking: builder.mutation<any, { matchId: string; trackingData: any }>({
      query: ({ matchId, trackingData }) => ({
        url: `/match/tracking/${matchId}/sync`,
        method: 'PUT',
        body: { trackingData },
      }),
      invalidatesTags: ['Match'],
    }),
    finishTracking: builder.mutation<any, { matchId: string; trackingData?: any }>({
      query: ({ matchId, trackingData }) => ({
        url: `/match/tracking/${matchId}/finish`,
        method: 'PUT',
        body: trackingData ? { trackingData } : {},
      }),
      invalidatesTags: ['Match'],
    }),
  }),
});

export const { useSyncTrackingMutation, useFinishTrackingMutation } = matchApi;

