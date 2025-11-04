"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { LiveMatchLayout } from "@/components/live/live-match-layout";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchEvents } from "@/lib/slices/eventSlice";
import { Loader2 } from "lucide-react";

export default function EventOverlayPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const dispatch = useAppDispatch();
  const { events, isLoading } = useAppSelector((state) => state.event);

  useEffect(() => {
    if (events.length === 0) {
      dispatch(fetchEvents());
    }
  }, [dispatch, events.length]);

  // Clean up any wrapper divs from root layout
  useEffect(() => {
    // Remove wrapper divs that might interfere
    const wrapperDivs = document.querySelectorAll('body > div');
    wrapperDivs.forEach((div) => {
      const element = div as HTMLElement;
      // Remove Providers wrapper styling
      if (element.classList.contains('relative')) {
        element.style.position = 'static';
        element.style.zIndex = 'auto';
        element.style.margin = '0';
        element.style.padding = '0';
      }
    });
  }, []);

  const event = events.find((e) => e.id === eventId);

  if (isLoading || !event) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-white" style={{ width: '1920px', height: '1080px' }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#ff073a]" />
      </div>
    );
  }

  // Get layout image URL - use event's layoutImage or default to bg.png
  const layoutImageUrl = event.layoutImage || '/bg.png';

  // Only render the preview component - nothing else!
  return (
    <LiveMatchLayout
      layoutImage={layoutImageUrl}
      showTwitchChat={event.showTwitchChat || false}
    >
      {{
        videoArea: (
          <div className="w-full h-full flex items-center justify-center text-white/40">
            <span style={{ fontSize: "16px" }}>OBS Video Area</span>
          </div>
        ),
        teamDetails: (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <h3 className="text-white text-lg font-semibold mb-2">{event.name}</h3>
            <p className="text-white/60 text-sm">
              {new Date(event.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            {event.location && (
              <p className="text-white/60 text-sm mt-1">{event.location}</p>
            )}
          </div>
        ),
      }}
    </LiveMatchLayout>
  );
}

