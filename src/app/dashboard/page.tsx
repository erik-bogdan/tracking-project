"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { EventCard } from "@/components/dashboard/event-card";
import { Calendar } from "lucide-react";
import { getUpcomingEvent, getUpcomingMatches } from "@/lib/mock-data";

export default function DashboardPage() {
  const upcomingEvent = getUpcomingEvent();
  const upcomingMatches = getUpcomingMatches(upcomingEvent);

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

      {/* Upcoming Event Card */}
      {upcomingEvent ? (
        <EventCard event={upcomingEvent} index={0} variant="dashboard" />
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
                No Upcoming Events
              </h3>
              <p className="text-white/60">
                Create your first event to get started!
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Card className="bg-[#0a0a0a] border-[#ff073a]/30">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-white mb-1">
              {upcomingEvent?.matches.length || 0}
            </div>
            <p className="text-sm text-white/60">Total Matches</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0a0a0a] border-[#ff073a]/30">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-[#ff073a] mb-1">
              {upcomingMatches.filter((m) => m.status === "live").length}
            </div>
            <p className="text-sm text-white/60">Live Matches</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0a0a0a] border-[#ff073a]/30">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-white mb-1">
              {upcomingMatches.filter((m) => m.status === "finished").length}
            </div>
            <p className="text-sm text-white/60">Finished Matches</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

