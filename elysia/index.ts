
import { Elysia, t } from 'elysia'
import { messageController } from './controllers/message'
import { authController } from './controllers/auth'
import { eventController } from './controllers/event'
import { matchController } from './controllers/match'
import { uploadController } from './controllers/upload'

// Elysia app needs /api prefix because Next.js route handler passes full path including /api
export const elysiaApp = new Elysia({ prefix: '/api' })
    .use(authController)
    .use(messageController)
    .use(uploadController)
    .use(eventController)
    .use(matchController)
    .onError(({ code, error }) => {
        console.log(code)
        return new Response(JSON.stringify({ error: error.toString() }), { status: 500 })
    })


export type TElysiaApp = typeof elysiaApp