CREATE TYPE "public"."event_type" AS ENUM('1on1', '2on2');--> statement-breakpoint
CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "event_type" NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"location" text,
	"show_twitch_chat" boolean DEFAULT false NOT NULL,
	"twitch_chat_api_key" text,
	"layout_image" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;