"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LiveMatchLayout } from "@/components/live/live-match-layout";
import { Loader2 } from "lucide-react";

interface Event {
  id: string;
  name: string;
  type: '1on1' | '2on2';
  date: string;
  location?: string;
  showTwitchChat: boolean;
  layoutImage?: string;
}

export default function LiveEventOverlayPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch event data from public endpoint
    const fetchEvent = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/event/public/${eventId}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          setEvent(data.data);
        } else {
          setError(data.error || 'Event not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load event');
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  // Clean up any wrapper divs from root layout
  useEffect(() => {
    // Remove background image and overlay from body
    const body = document.body;
    body.style.backgroundImage = 'none';
    body.style.backgroundColor = 'white';
    body.style.background = 'white';
    body.style.margin = '0';
    body.style.padding = '0';
    
    // Hide root layout overlay div (the gradient overlay)
    const rootOverlay = document.querySelector('div[style*="linear-gradient"]');
    if (rootOverlay) {
      (rootOverlay as HTMLElement).style.display = 'none';
    }
    
    // Hide Toaster
    const toaster = document.querySelector('[data-sonner-toaster]');
    if (toaster) {
      (toaster as HTMLElement).style.display = 'none';
    }
    
    // Remove wrapper divs from Providers
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-white" style={{ width: '1920px', height: '1080px' }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#ff073a]" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-white" style={{ width: '1920px', height: '1080px' }}>
        <div className="text-center">
          <p className="text-[#ff073a] text-lg">{error || 'Event not found'}</p>
        </div>
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

