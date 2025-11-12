"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MatchCard } from "@/components/dashboard/match-card";
import { Calendar, MapPin, ChevronDown, Clock, Plus, ExternalLink, Edit } from "lucide-react";
import Link from "next/link";
import { Event, convertMatch, DatabaseMatch } from "@/types/match";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchMatches } from "@/lib/slices/matchSlice";
import { MatchTypeBadge } from "@/components/dashboard/match/match-type-badge";

interface EventCardProps {
  event: Event;
  index?: number;
  variant?: "default" | "dashboard";
}

export function EventCard({ event, index = 0, variant = "default" }: EventCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const dispatch = useAppDispatch();
  const { matches: allMatches } = useAppSelector((state) => state.match);
  
  // Get matches for this event
  const eventMatches = allMatches.filter(m => m.eventId === event.id);
  const convertedMatches = eventMatches.map(convertMatch);

  // Don't fetch matches here - they should already be loaded by the dashboard page
  // Only fetch if we're in a context where matches aren't pre-loaded (e.g., events list page)
  // For dashboard variant, matches are already loaded by the parent component
  useEffect(() => {
    // Only fetch if variant is not dashboard (dashboard page handles fetching)
    if (isOpen && variant !== 'dashboard') {
      dispatch(fetchMatches(event.id));
    }
  }, [isOpen, dispatch, event.id, variant]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className={cn(
        "border-[#ff073a]/30 backdrop-blur-sm overflow-hidden",
        variant === "dashboard" 
          ? "bg-gradient-to-br from-[#0a0a0a] to-[#1a0a0a] shadow-xl"
          : "bg-[#0a0a0a]"
      )}>
        <CardHeader 
          className="cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
                <Calendar className="h-6 w-6 text-[#ff073a]" />
                {event.name}
                {event.type && (
                  <MatchTypeBadge type={event.type} />
                )}
              </CardTitle>
              {event.description && (
                <p className="text-white/60 text-sm mt-1">
                  {event.description}
                </p>
              )}
              {/* OBS Overlay Link - uses UUID directly */}
              <div className="mt-2">
                <Link 
                  href={`/live-event/${encodeURIComponent(event.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-2 text-sm text-[#ff4569] hover:text-[#ff073a] transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>OBS Overlay Link</span>
                </Link>
              </div>
              <div className={cn(
                "flex items-center gap-4 text-sm text-white/70 mt-2 flex-wrap",
                variant === "dashboard" && "gap-6"
              )}>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#ff4569]" />
                  <span>
                    {new Date(event.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#ff4569]" />
                    <span>{event.location}</span>
                  </div>
                )}
                {variant === "default" && (
                  <div className="text-white/50 text-xs">
                    {convertedMatches.length} match{convertedMatches.length !== 1 ? "es" : ""}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/events/${event.id}/edit`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/5 border-[#ff073a]/30 text-white hover:bg-[#ff073a]/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </Link>
              <Link href={`/dashboard/events/${event.id}/matches/new`}>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-gradient-to-r from-[#ff073a] to-[#ff1744] text-white hover:from-[#ff1744] hover:to-[#ff4569]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New event match
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-white/70 hover:text-white hover:bg-[#ff073a]/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(!isOpen);
                }}
              >
                <ChevronDown
                  className={cn(
                    "h-5 w-5 transition-transform duration-300",
                    isOpen && "rotate-180"
                  )}
                />
              </Button>
            </div>
          </div>
        </CardHeader>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              <CardContent className={cn(
                variant === "dashboard" && "space-y-4"
              )}>
                {variant === "dashboard" && (
                  <div className="pt-4 border-t border-[#ff073a]/20">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Upcoming Matches
                    </h3>
                  </div>
                )}
                {variant === "default" && (
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Matches ({convertedMatches.length})
                  </h3>
                )}
                {variant === "dashboard" && convertedMatches.filter((m) => {
                  const today = new Date();
                  const matchDateTime = new Date(`${m.date}T${m.time}`);
                  return matchDateTime >= today || m.status === "live";
                }).length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No upcoming matches scheduled</p>
                  </div>
                ) : convertedMatches.length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No matches yet. Create your first match!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(variant === "dashboard" 
                      ? convertedMatches.filter((m) => {
                          const today = new Date();
                          const matchDateTime = new Date(`${m.date}T${m.time}`);
                          return matchDateTime >= today || m.status === "live";
                        })
                      : convertedMatches
                    ).map((match) => (
                      <MatchCard key={match.id} match={match} eventId={event.id} />
                    ))}
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

