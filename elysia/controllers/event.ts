import Elysia, { t } from "elysia";
import { db } from "../lib/db";
import { event, match } from "../database/schema";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";

export const eventController = new Elysia({ prefix: '/event' })
    .post('/create', async ({ body, request }) => {
        try {
            // Get session from better-auth
            const session = await auth.api.getSession({ headers: request.headers });
            
            if (!session?.user?.id) {
                return {
                    success: false,
                    error: 'Unauthorized',
                };
            }

            const userId = session.user.id;
            
            const newEvent = await db.insert(event).values({
                id: crypto.randomUUID(),
                name: body.name,
                type: body.type,
                date: new Date(body.dateTime),
                location: body.location || null,
                showTwitchChat: body.showTwitchChat || false,
                twitchChatApiKey: body.showTwitchChat ? body.twitchChatApiKey : null,
                layoutImage: body.layoutImage || null,
                userId: userId,
            }).returning();

            return {
                success: true,
                data: newEvent[0],
            };
        } catch (error: any) {
            console.error('Error creating event:', error);
            return {
                success: false,
                error: error.message || 'Failed to create event',
            };
        }
    }, {
        body: t.Object({
            name: t.String(),
            type: t.Union([t.Literal('1on1'), t.Literal('2on2')]),
            dateTime: t.String(), // ISO string
            location: t.Optional(t.String()),
            showTwitchChat: t.Optional(t.Boolean()),
            twitchChatApiKey: t.Optional(t.String()),
            layoutImage: t.Optional(t.String()),
        }),
    })
    .get('/list', async ({ request }) => {
        try {
            // Get session from better-auth
            const session = await auth.api.getSession({ headers: request.headers });
            
            if (!session?.user?.id) {
                return {
                    success: false,
                    error: 'Unauthorized',
                };
            }

            const userId = session.user.id;
            
            const events = await db.select().from(event).where(eq(event.userId, userId));
            
            return {
                success: true,
                data: events,
            };
        } catch (error: any) {
            console.error('Error fetching events:', error);
            return {
                success: false,
                error: error.message || 'Failed to fetch events',
            };
        }
    })
    .get('/public/:id', async ({ params }) => {
        try {
            const eventId = params.id;
            
            const events = await db.select().from(event)
                .where(eq(event.id, eventId))
                .limit(1);
            
            if (events.length === 0) {
                return {
                    success: false,
                    error: 'Event not found',
                };
            }

            const eventData = events[0];
            
            // Return only public data (no sensitive information)
            return {
                success: true,
                data: {
                    id: eventData.id,
                    name: eventData.name,
                    type: eventData.type,
                    date: eventData.date,
                    location: eventData.location,
                    showTwitchChat: eventData.showTwitchChat,
                    layoutImage: eventData.layoutImage,
                    // Don't return userId, twitchChatApiKey, createdAt, updatedAt
                },
            };
        } catch (error: any) {
            console.error('Error fetching public event:', error);
            return {
                success: false,
                error: error.message || 'Failed to fetch event',
            };
        }
    })
    .get('/public/:id/matches', async ({ params }) => {
        try {
            const eventId = params.id;
            
            // Verify event exists
            const events = await db.select().from(event)
                .where(eq(event.id, eventId))
                .limit(1);
            
            if (events.length === 0) {
                return {
                    success: false,
                    error: 'Event not found',
                };
            }

            // Get matches for this event, ordered by date
            const matches = await db.select().from(match)
                .where(eq(match.eventId, eventId))
                .orderBy(match.date);
            
            // Return only public match data
            return {
                success: true,
                data: matches.map(m => ({
                    id: m.id,
                    type: m.type,
                    status: m.status,
                    date: m.date,
                    // 1v1 fields
                    homePlayerName: m.homePlayerName,
                    awayPlayerName: m.awayPlayerName,
                    // 2v2 fields
                    homeTeamName: m.homeTeamName,
                    homePlayer1Name: m.homePlayer1Name,
                    homePlayer2Name: m.homePlayer2Name,
                    awayTeamName: m.awayTeamName,
                    awayPlayer1Name: m.awayPlayer1Name,
                    awayPlayer2Name: m.awayPlayer2Name,
                    // Scores
                    homeScore: m.homeScore,
                    awayScore: m.awayScore,
                    bestOf: m.bestOf,
                    // Tracking data (public, for live display)
                    trackingData: m.trackingData,
                    // Don't return eventId, createdAt, updatedAt
                })),
            };
        } catch (error: any) {
            console.error('Error fetching public matches:', error);
            return {
                success: false,
                error: error.message || 'Failed to fetch matches',
            };
        }
    })
    .get('/:id', async ({ params, request }) => {
        try {
            // Get session from better-auth
            const session = await auth.api.getSession({ headers: request.headers });
            
            if (!session?.user?.id) {
                return {
                    success: false,
                    error: 'Unauthorized',
                };
            }

            const userId = session.user.id;
            const eventId = params.id;
            
            const events = await db.select().from(event)
                .where(eq(event.id, eventId))
                .limit(1);
            
            if (events.length === 0) {
                return {
                    success: false,
                    error: 'Event not found',
                };
            }

            const eventData = events[0];
            
            // Check if user owns this event
            if (eventData.userId !== userId) {
                return {
                    success: false,
                    error: 'Unauthorized',
                };
            }
            
            return {
                success: true,
                data: eventData,
            };
        } catch (error: any) {
            console.error('Error fetching event:', error);
            return {
                success: false,
                error: error.message || 'Failed to fetch event',
            };
        }
    })
    .put('/:id', async ({ params, body, request }) => {
        try {
            // Get session from better-auth
            const session = await auth.api.getSession({ headers: request.headers });
            
            if (!session?.user?.id) {
                return {
                    success: false,
                    error: 'Unauthorized',
                };
            }

            const userId = session.user.id;
            const eventId = params.id;
            
            // Verify event exists and belongs to user
            const existingEvents = await db.select().from(event)
                .where(eq(event.id, eventId))
                .limit(1);
            
            if (existingEvents.length === 0) {
                return {
                    success: false,
                    error: 'Event not found',
                };
            }

            if (existingEvents[0].userId !== userId) {
                return {
                    success: false,
                    error: 'Unauthorized',
                };
            }
            
            const updatedEvent = await db.update(event)
                .set({
                    name: body.name,
                    type: body.type,
                    date: new Date(body.dateTime),
                    location: body.location || null,
                    showTwitchChat: body.showTwitchChat || false,
                    twitchChatApiKey: body.showTwitchChat ? body.twitchChatApiKey : null,
                    layoutImage: body.layoutImage || null,
                    updatedAt: new Date(),
                })
                .where(eq(event.id, eventId))
                .returning();

            return {
                success: true,
                data: updatedEvent[0],
            };
        } catch (error: any) {
            console.error('Error updating event:', error);
            return {
                success: false,
                error: error.message || 'Failed to update event',
            };
        }
    }, {
        params: t.Object({
            id: t.String(),
        }),
        body: t.Object({
            name: t.String(),
            type: t.Union([t.Literal('1on1'), t.Literal('2on2')]),
            dateTime: t.String(), // ISO string
            location: t.Optional(t.String()),
            showTwitchChat: t.Optional(t.Boolean()),
            twitchChatApiKey: t.Optional(t.String()),
            layoutImage: t.Optional(t.String()),
        }),
    });

