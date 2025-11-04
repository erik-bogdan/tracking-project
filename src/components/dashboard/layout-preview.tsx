"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LayoutPreviewProps {
  layoutImage?: string | null;
  showTwitchChat?: boolean;
  className?: string;
}

export function LayoutPreview({ layoutImage, showTwitchChat = false, className }: LayoutPreviewProps) {
  const hasImage = useMemo(() => !!layoutImage, [layoutImage]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const originalWidth = 1920;
        const newScale = containerWidth / originalWidth;
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [layoutImage]);

  if (!hasImage) {
    return (
      <div
        className={cn(
          "w-full aspect-video bg-[#0a0a0a] border border-[#ff073a]/30 rounded-lg flex items-center justify-center",
          className
        )}
      >
        <p className="text-white/40 text-sm">Upload a layout image to see preview</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full relative", className)}>
      {/* Main 1920x1080 container - scales to fit container */}
      <div
        ref={containerRef}
        className="relative w-full mx-auto bg-black rounded-lg overflow-hidden"
        style={{
          aspectRatio: "1920/1080",
          backgroundImage: layoutImage ? `url(${layoutImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Scaling container - maintains 1920x1080 internal proportions */}
        <div
          className="absolute top-0 left-0"
          style={{
            width: "1920px",
            height: "1080px",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {/* Use LiveMatchLayout for consistent structure */}
          <div style={{ width: "1920px", height: "1080px", position: "relative" }}>
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
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-400" style={{ fontSize: "14px" }}>
                      Twitch Chat placeholder
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Video Area - Right Side */}
            <div 
              className="absolute bg-black rounded-xl overflow-hidden bg-[#001a3a]/95 border border-[#ff5c1a]/30"
              style={{
                top: "45px",
                left: "595px",
                width: "1280px",
                height: "783px",
              }}
            >
              <div className="w-full h-full flex items-center justify-center text-white/40">
                <span style={{ fontSize: "16px" }}>OBS Video Area</span>
              </div>
            </div>

            {/* Tracking/Team Details Bar - Below Main Video */}
            <div 
              className="absolute rounded-xl bg-[#001a3a]/95 border border-[#ff5c1a]/30"
              style={{
                top: "855px",
                left: "595px",
                width: "1280px",
                height: "180px",
              }}
            >
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400" style={{ fontSize: "14px" }}>
                  Team details / Live stats placeholder
                </p>
              </div>
            </div>

            {/* Mini Broadcaster Feed - Bottom Left */}
            <div 
              className="absolute bg-black/80 rounded-lg overflow-hidden border border-[#ff5c1a]/30"
              style={{
                top: "785px",
                left: "45px",
                width: "400px",
                height: "250px",
              }}
            >
              <div className="w-full h-full flex items-center justify-center text-white/40">
                <span style={{ fontSize: "14px" }}>Mini Broadcaster Feed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

