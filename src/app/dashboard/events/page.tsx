"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { EventCard } from "@/components/dashboard/event-card";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchEvents } from "@/lib/slices/eventSlice";
import { Event } from "@/types/match";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function EventsPage() {
  const dispatch = useAppDispatch();
  const { events, isLoading, error } = useAppSelector((state) => state.event);

  useEffect(() => {
    dispatch(fetchEvents());
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff073a]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">My Events</h1>
            <p className="text-white/60">Manage and view all your events</p>
          </div>
          <Link href="/dashboard/events/new">
            <Button
              variant="default"
              size="default"
              className="bg-gradient-to-r from-[#ff073a] to-[#ff1744] text-white hover:from-[#ff1744] hover:to-[#ff4569]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create new event
            </Button>
          </Link>
        </div>
      </motion.div>

      {error && (
        <div className="p-4 bg-[#ff073a]/20 border border-[#ff073a]/30 rounded-lg">
          <p className="text-sm text-[#ff4569]">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {events.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <p>No events found. Create your first event to get started.</p>
          </div>
        ) : (
          events.map((event, idx) => {
            // Convert event to match Event interface - ensure UUID is properly passed
            const eventForCard: Event = {
              id: event.id, // UUID string
              name: event.name,
              date: event.date,
              location: event.location,
              type: event.type,
              layoutImage: event.layoutImage,
              showTwitchChat: event.showTwitchChat,
            };
            return <EventCard key={event.id} event={eventForCard} index={idx} />;
          })
        )}
      </div>
    </div>
  );
}

