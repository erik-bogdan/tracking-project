import { Event, Match } from "@/types/match";

export const mockEvents: Event[] = [
  {
    id: "1",
    name: "Weekend Tournament",
    description: "Fun weekend beerpong tournament",
    date: "2025-11-09",
    location: "Budapest, Hungary",
    matches: [
      {
        id: "m1",
        type: "1on1",
        status: "not_started",
        date: "2025-11-09",
        time: "14:00",
        players: {
          team1: ["John Doe"],
          team2: ["Jane Smith"],
        },
      },
      {
        id: "m2",
        type: "2on2",
        status: "live",
        date: "2025-11-09",
        time: "15:30",
        players: {
          team1: ["Alice Johnson", "Bob Williams"],
          team2: ["Charlie Brown", "Diana Prince"],
        },
        score: {
          team1: 5,
          team2: 3,
        },
      },
      {
        id: "m3",
        type: "1on1",
        status: "finished",
        date: "2025-11-09",
        time: "13:00",
        players: {
          team1: ["Mike Tyson"],
          team2: ["Erik Bogdan"],
        },
        score: {
          team1: 10,
          team2: 7,
        },
      },
      {
        id: "m4",
        type: "2on2",
        status: "not_started",
        date: "2025-11-09",
        time: "16:00",
        players: {
          team1: ["Sarah Connor", "Terminator"],
          team2: ["Neo", "Morpheus"],
        },
      },
    ],
  },
  {
    id: "2",
    name: "Championship Finals",
    description: "Final championship event",
    date: "2025-11-15",
    location: "Budapest, Hungary",
    matches: [
      {
        id: "m5",
        type: "1on1",
        status: "not_started",
        date: "2025-11-15",
        time: "18:00",
        players: {
          team1: ["Player A"],
          team2: ["Player B"],
        },
      },
      {
        id: "m6",
        type: "2on2",
        status: "not_started",
        date: "2025-11-15",
        time: "19:00",
        players: {
          team1: ["Team Alpha Player 1", "Team Alpha Player 2"],
          team2: ["Team Beta Player 1", "Team Beta Player 2"],
        },
      },
    ],
  },
];

export function getUpcomingEvent(): Event | null {
  const today = new Date();
  const upcomingEvents = mockEvents
    .filter((event) => new Date(event.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return upcomingEvents.length > 0 ? upcomingEvents[0] : null;
}

export function getUpcomingMatches(event: Event | null): Match[] {
  if (!event) return [];
  
  const today = new Date();
  const upcomingMatches = event.matches.filter((match) => {
    const matchDateTime = new Date(`${match.date}T${match.time}`);
    return matchDateTime >= today || match.status === "live";
  });

  return upcomingMatches.sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });
}


