CREATE TYPE "public"."match_status" AS ENUM('not_started', 'live', 'finished');--> statement-breakpoint
CREATE TABLE "match" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"type" "event_type" NOT NULL,
	"status" "match_status" DEFAULT 'not_started' NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"home_player_name" text,
	"away_player_name" text,
	"home_team_name" text,
	"home_player1_name" text,
	"home_player2_name" text,
	"away_team_name" text,
	"away_player1_name" text,
	"away_player2_name" text,
	"home_score" integer,
	"away_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;