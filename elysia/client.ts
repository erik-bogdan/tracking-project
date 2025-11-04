import { treaty } from '@elysiajs/eden'
import { TElysiaApp } from '.'

// Get base URL with /api prefix
// Treaty generates paths like /event/create but doesn't include the main Elysia app prefix
// So we add /api to the base URL to get /api/event/create
const getBaseURL = () => {
  const base = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  
  return `${base}/api`
}

// Treaty client configuration
// Base URL includes /api because Treaty doesn't include the main app prefix in paths
export const api = treaty<TElysiaApp>(getBaseURL(), {
  fetch: {
    credentials: 'include', // Important for cookies/auth
  },
})
