"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { EventCard } from "@/components/dashboard/event-card";
import { Calendar, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchEvents } from "@/lib/slices/eventSlice";
import { fetchMatches } from "@/lib/slices/matchSlice";
import { Event } from "@/types/match";

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { events, isLoading: eventsLoading } = useAppSelector((state) => state.event);
  const { matches: allMatches, isLoading: matchesLoading } = useAppSelector((state) => state.match);
  const fetchedEventIdsRef = useRef<Set<string>>(new Set());

  // Fetch events on mount
  useEffect(() => {
    dispatch(fetchEvents());
  }, [dispatch]);

  // Fetch matches for all events - use ref to track fetched events and avoid infinite loop
  const previousEventIdsRef = useRef<string>('');
  
  useEffect(() => {
    if (events.length > 0) {
      // Create stable event IDs string for comparison
      const currentEventIds = events.map(e => e.id).sort().join(',');
      
      // Only fetch if event IDs have changed
      if (currentEventIds !== previousEventIdsRef.current) {
        previousEventIdsRef.current = currentEventIds;
        const uniqueEventIds = [...new Set(events.map(e => e.id))];
        
        // Only fetch if we haven't fetched matches for this event yet
        uniqueEventIds.forEach((eventId) => {
          if (!fetchedEventIdsRef.current.has(eventId)) {
            fetchedEventIdsRef.current.add(eventId);
            dispatch(fetchMatches(eventId));
          }
        });
      }
    }
    // Only depend on events.length and a stable string of event IDs
    // We use a ref comparison inside to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length, events.map(e => e.id).sort().join(',')]);

  // Find active or next event with matches
  const activeOrNextEvent = useMemo(() => {
    if (events.length === 0) return null;

    const now = new Date();

    // First, try to find an event with live matches
    for (const event of events) {
      const eventMatches = allMatches.filter(m => m.eventId === event.id);
      const hasLiveMatches = eventMatches.some(m => m.status === 'live');
      
      if (hasLiveMatches) {
        return event;
      }
    }

    // If no live matches, find the next upcoming event with matches
    const eventsWithMatches = events
      .map(event => {
        const eventMatches = allMatches.filter(m => m.eventId === event.id);
        return { event, matches: eventMatches };
      })
      .filter(({ matches }) => matches.length > 0)
      .sort((a, b) => {
        // Sort by event date
        const dateA = new Date(a.event.date).getTime();
        const dateB = new Date(b.event.date).getTime();
        return dateA - dateB;
      });

    if (eventsWithMatches.length > 0) {
      return eventsWithMatches[0].event;
    }

    return null;
  }, [events, allMatches]);

  // Get matches for the selected event
  const eventMatches = useMemo(() => {
    if (!activeOrNextEvent) return [];
    return allMatches.filter(m => m.eventId === activeOrNextEvent.id);
  }, [activeOrNextEvent, allMatches]);

  // Convert event to Event type for EventCard
  const eventForCard: Event | null = activeOrNextEvent ? {
    id: activeOrNextEvent.id,
    name: activeOrNextEvent.name,
    date: activeOrNextEvent.date,
    location: activeOrNextEvent.location || undefined,
    type: activeOrNextEvent.type,
    layoutImage: activeOrNextEvent.layoutImage || undefined,
    showTwitchChat: activeOrNextEvent.showTwitchChat || false,
  } : null;

  const isLoading = eventsLoading || matchesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff073a]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold text-white mb-2">
          Dashboard
        </h1>
        <p className="text-white/60">
          Welcome back! Here's what's happening with your events.
        </p>
      </motion.div>

      {/* Active or Next Event Card */}
      {eventForCard ? (
        <EventCard event={eventForCard} index={0} variant="dashboard" />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-[#0a0a0a] border-[#ff073a]/30">
            <CardContent className="py-12 text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-white/20" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {events.length === 0 ? 'No Events' : 'No Events with Matches'}
              </h3>
              <p className="text-white/60 mb-6">
                {events.length === 0 
                  ? 'Create your first event to get started!'
                  : 'Create matches for your events to see them here.'}
              </p>
              {events.length === 0 && (
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
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Stats */}
      {eventForCard && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <Card className="bg-[#0a0a0a] border-[#ff073a]/30">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-white mb-1">
                {eventMatches.length}
              </div>
              <p className="text-sm text-white/60">Total Matches</p>
            </CardContent>
          </Card>
          <Card className="bg-[#0a0a0a] border-[#ff073a]/30">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-[#ff073a] mb-1">
                {eventMatches.filter((m) => m.status === "live").length}
              </div>
              <p className="text-sm text-white/60">Live Matches</p>
            </CardContent>
          </Card>
          <Card className="bg-[#0a0a0a] border-[#ff073a]/30">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-white mb-1">
                {eventMatches.filter((m) => m.status === "finished").length}
              </div>
              <p className="text-sm text-white/60">Finished Matches</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

