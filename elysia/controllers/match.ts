import Elysia, { t } from "elysia";
import { db } from "../lib/db";
import { match, event } from "../database/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "../lib/auth";

export const matchController = new Elysia({ prefix: '/match' })
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

            // Verify event exists and belongs to user
            const eventData = await db.select().from(event)
                .where(and(
                    eq(event.id, body.eventId),
                    eq(event.userId, userId)
                ))
                .limit(1);

            if (eventData.length === 0) {
                return {
                    success: false,
                    error: 'Event not found or access denied',
                };
            }

            // Validate match data based on type
            if (body.type === '1on1') {
                if (!body.homePlayerName || !body.awayPlayerName) {
                    return {
                        success: false,
                        error: 'Home player name and away player name are required for 1v1 matches',
                    };
                }
            } else if (body.type === '2on2') {
                if (!body.homeTeamName || !body.homePlayer1Name || !body.homePlayer2Name ||
                    !body.awayTeamName || !body.awayPlayer1Name || !body.awayPlayer2Name) {
                    return {
                        success: false,
                        error: 'All team and player names are required for 2v2 matches',
                    };
                }
            }

            const newMatch = await db.insert(match).values({
                id: crypto.randomUUID(),
                eventId: body.eventId,
                type: body.type,
                status: 'not_started',
                date: new Date(body.dateTime),
                // 1v1 fields
                homePlayerName: body.homePlayerName || null,
                awayPlayerName: body.awayPlayerName || null,
                // 2v2 fields
                homeTeamName: body.homeTeamName || null,
                homePlayer1Name: body.homePlayer1Name || null,
                homePlayer2Name: body.homePlayer2Name || null,
                awayTeamName: body.awayTeamName || null,
                awayPlayer1Name: body.awayPlayer1Name || null,
                awayPlayer2Name: body.awayPlayer2Name || null,
            }).returning();

            return {
                success: true,
                data: newMatch[0],
            };
        } catch (error: any) {
            console.error('Error creating match:', error);
            return {
                success: false,
                error: error.message || 'Failed to create match',
            };
        }
    }, {
        body: t.Object({
            eventId: t.String(),
            type: t.Union([t.Literal('1on1'), t.Literal('2on2')]),
            dateTime: t.String(), // ISO string
            // 1v1 fields (optional in schema, required in validation)
            homePlayerName: t.Optional(t.String()),
            awayPlayerName: t.Optional(t.String()),
            // 2v2 fields (optional in schema, required in validation)
            homeTeamName: t.Optional(t.String()),
            homePlayer1Name: t.Optional(t.String()),
            homePlayer2Name: t.Optional(t.String()),
            awayTeamName: t.Optional(t.String()),
            awayPlayer1Name: t.Optional(t.String()),
            awayPlayer2Name: t.Optional(t.String()),
        }),
    })
    .get('/list', async ({ query, request }) => {
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
            const eventId = query.eventId;

            if (!eventId) {
                return {
                    success: false,
                    error: 'eventId is required',
                };
            }

            // Verify event exists and belongs to user
            const eventData = await db.select().from(event)
                .where(and(
                    eq(event.id, eventId),
                    eq(event.userId, userId)
                ))
                .limit(1);

            if (eventData.length === 0) {
                return {
                    success: false,
                    error: 'Event not found or access denied',
                };
            }

            // Get matches for this event
            const matches = await db.select().from(match)
                .where(eq(match.eventId, eventId))
                .orderBy(match.date);

            return {
                success: true,
                data: matches,
            };
        } catch (error: any) {
            console.error('Error fetching matches:', error);
            return {
                success: false,
                error: error.message || 'Failed to fetch matches',
            };
        }
    }, {
        query: t.Object({
            eventId: t.String(),
        }),
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
            const matchId = params.id;

            // Get match
            const matches = await db.select().from(match)
                .where(eq(match.id, matchId))
                .limit(1);

            if (matches.length === 0) {
                return {
                    success: false,
                    error: 'Match not found',
                };
            }

            const matchData = matches[0];

            // Verify event belongs to user
            const eventData = await db.select().from(event)
                .where(and(
                    eq(event.id, matchData.eventId),
                    eq(event.userId, userId)
                ))
                .limit(1);

            if (eventData.length === 0) {
                return {
                    success: false,
                    error: 'Unauthorized',
                };
            }

            return {
                success: true,
                data: matchData,
            };
        } catch (error: any) {
            console.error('Error fetching match:', error);
            return {
                success: false,
                error: error.message || 'Failed to fetch match',
            };
        }
    })
    .post('/start', async ({ body, request }) => {
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
            const matchId = body.matchId;

            if (!matchId) {
                return {
                    success: false,
                    error: 'matchId is required',
                };
            }

            // Get match
            const matches = await db.select().from(match)
                .where(eq(match.id, matchId))
                .limit(1);

            if (matches.length === 0) {
                return {
                    success: false,
                    error: 'Match not found',
                };
            }

            const matchData = matches[0];

            // Verify event belongs to user
            const eventData = await db.select().from(event)
                .where(and(
                    eq(event.id, matchData.eventId),
                    eq(event.userId, userId)
                ))
                .limit(1);

            if (eventData.length === 0) {
                return {
                    success: false,
                    error: 'Unauthorized',
                };
            }

            // Only allow starting if status is 'not_started'
            if (matchData.status !== 'not_started') {
                return {
                    success: false,
                    error: 'Match can only be started if status is not_started',
                };
            }

            // Update match status to 'live'
            const updatedMatch = await db.update(match)
                .set({
                    status: 'live',
                    updatedAt: new Date(),
                })
                .where(eq(match.id, matchId))
                .returning();

            return {
                success: true,
                data: updatedMatch[0],
            };
        } catch (error: any) {
            console.error('Error starting match:', error);
            return {
                success: false,
                error: error.message || 'Failed to start match',
            };
        }
    }, {
        body: t.Object({
            matchId: t.String(),
        }),
    });

