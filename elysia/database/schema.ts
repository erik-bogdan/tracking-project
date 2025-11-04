import { desc, sql } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, decimal, pgEnum, uniqueIndex, pgView, integer, uuid, jsonb, varchar, json, primaryKey, numeric, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
export const participantTypeEnum = pgEnum("tournament_participant_type", ["1v1", "2v2"]);
export const tournamentTypeEnum = pgEnum("tournament_type", ["lux", "knockout", "swiss", "round_robin", "group_stage"]);
export const orderStatusEnum = pgEnum("order_status", ['pending', 'paid', 'failed', 'cancelled']);
export const eventTypeEnum = pgEnum("event_type", ["1on1", "2on2"]);

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text('name').notNull(),
	nickname: text('nickname'), // Optional field
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	role: text('role'),
	banned: boolean('banned'),
	banReason: text('ban_reason'),
	banExpires: timestamp('ban_expires'),
	lang: text('lang'),
	organizationName: text('organization_name'),
},
	(table) => [
		// Ez egy egyedi indexet hoz létre a felhasználók nevein, hogy ne lehessen két azonos nevű felhasználó
		// Ezt el kell távolítani, mert nem szeretnénk korlátozni a felhasználóneveket
		// uniqueIndex("name_idx").on(table.name)
	]);

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	impersonatedBy: text('impersonated_by')
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull()
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const event = pgTable("event", {
	id: text("id").primaryKey(),
	name: text('name').notNull(),
	type: eventTypeEnum('type').notNull(),
	date: timestamp('date', { withTimezone: true }).notNull(),
	location: text('location'),
	showTwitchChat: boolean('show_twitch_chat').notNull().default(false),
	twitchChatApiKey: text('twitch_chat_api_key'),
	layoutImage: text('layout_image'), // URL vagy path a feltöltött képhez
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const matchStatusEnum = pgEnum("match_status", ["not_started", "live", "finished"]);

export const match = pgTable("match", {
	id: text("id").primaryKey(),
	eventId: text('event_id').notNull().references(() => event.id, { onDelete: 'cascade' }),
	type: eventTypeEnum('type').notNull(), // 1on1 or 2on2
	status: matchStatusEnum('status').notNull().default('not_started'),
	date: timestamp('date', { withTimezone: true }).notNull(),
	// 1v1 fields (optional)
	homePlayerName: text('home_player_name'),
	awayPlayerName: text('away_player_name'),
	// 2v2 fields (optional)
	homeTeamName: text('home_team_name'),
	homePlayer1Name: text('home_player1_name'),
	homePlayer2Name: text('home_player2_name'),
	awayTeamName: text('away_team_name'),
	awayPlayer1Name: text('away_player1_name'),
	awayPlayer2Name: text('away_player2_name'),
	// Score (optional)
	homeScore: integer('home_score'),
	awayScore: integer('away_score'),
	// Tracking data (JSONB) - stores player throw statistics
	trackingData: jsonb('tracking_data'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
