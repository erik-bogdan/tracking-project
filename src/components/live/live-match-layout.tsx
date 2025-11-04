"use client";

import { cn } from "@/lib/utils";

interface LiveMatchLayoutProps {
  layoutImage?: string | null;
  showTwitchChat?: boolean;
  className?: string;
  children?: {
    chat?: React.ReactNode;
    videoArea?: React.ReactNode;
    teamDetails?: React.ReactNode;
    broadcasterFeed?: React.ReactNode;
  };
}

/**
 * Live Match Layout Component
 * 
 * Reusable component for displaying live match layout with 1920x1080 dimensions.
 * This is the template used for both preview and production OBS overlay.
 * 
 * Layout structure:
 * - Chat area (top left, 400x655px) - only if showTwitchChat is true
 * - Main Video Area (right side, 1280x783px)
 * - Team Details Bar (below video, 1280x180px)
 * - Mini Broadcaster Feed (bottom left, 400x250px)
 * 
 * @example
 * ```tsx
 * <LiveMatchLayout
 *   layoutImage="/path/to/layout.png"
 *   showTwitchChat={true}
 *   children={{
 *     chat: <TwitchChatComponent />,
 *     videoArea: <OBSVideoSource />,
 *     teamDetails: <LiveStatsComponent />,
 *     broadcasterFeed: <MiniFeedComponent />
 *   }}
 * />
 * ```
 */
export function LiveMatchLayout({ 
  layoutImage, 
  showTwitchChat = false, 
  className,
  children 
}: LiveMatchLayoutProps) {
  return (
    <div className={cn("fixed inset-0 w-screen h-screen overflow-hidden", className)}>
      {/* Main 1920x1080 container */}
      <div
        className="relative w-[1920px] h-[1080px] mx-auto"
        style={{
          backgroundImage: layoutImage ? `url(${layoutImage})` : 'url(/bg.png)',
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Chat - Top Left (only visible if showTwitchChat is true) */}
        {showTwitchChat && (
          <div
            className="absolute"
            style={{
              top: "45px",
              left: "45px",
              width: "400px",
              height: "655px",
            }}
          >
            <h3
              className="text-white font-semibold drop-shadow-lg"
              style={{ fontSize: "18px", marginBottom: "8px" }}
            >
              Chat:
            </h3>
            <div
              className="w-full bg-[#001a3a]/30 rounded-lg border border-[#ff5c1a]/30 overflow-hidden"
              style={{ height: "calc(100% - 32px)" }}
            >
              {children?.chat || (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-400" style={{ fontSize: "14px" }}>
                    Twitch Chat placeholder
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Video Area - Right Side */}
        <div
          className="absolute bg-black rounded-xl overflow-hidden bg-[#001a3a]/95 border border-[#ff5c1a]/30"
          style={{
            top: "45px",
            left: "595px", // 1920 - 1280 - 45
            width: "1280px",
            height: "783px",
          }}
        >
          {children?.videoArea || (
            <div className="w-full h-full flex items-center justify-center text-white/40">
              <span style={{ fontSize: "16px" }}>OBS Video Area</span>
            </div>
          )}
        </div>

        {/* Tracking/Team Details Bar - Below Main Video */}
        <div
          className="absolute rounded-xl bg-[#001a3a]/95 border border-[#ff5c1a]/30"
          style={{
            top: "855px", // 1080 - 180 - 45
            left: "595px", // 1920 - 1280 - 45
            width: "1280px",
            height: "180px",
          }}
        >
          {children?.teamDetails || (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-400" style={{ fontSize: "14px" }}>
                Team details / Live stats placeholder
              </p>
            </div>
          )}
        </div>

        {/* Mini Broadcaster Feed - Bottom Left */}
        <div
          className="absolute bg-black/80 rounded-lg overflow-hidden border border-[#ff5c1a]/30"
          style={{
            top: "785px", // 1080 - 250 - 45
            left: "45px",
            width: "400px",
            height: "250px",
          }}
        >
          {children?.broadcasterFeed || (
            <div className="w-full h-full flex items-center justify-center text-white/40">
              <span style={{ fontSize: "14px" }}>Mini Broadcaster Feed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

