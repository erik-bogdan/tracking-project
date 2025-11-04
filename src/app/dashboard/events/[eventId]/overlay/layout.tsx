"use client";

import { useEffect } from "react";

export default function OverlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Clean white background layout for OBS overlay - remove ALL unnecessary elements
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
      // Keep only the overlay content, remove Providers wrapper styling
      if (element.classList.contains('relative') && element.style.zIndex === '10') {
        element.style.position = 'static';
        element.style.zIndex = 'auto';
      }
    });

    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 w-screen h-screen bg-white"
      style={{
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        backgroundColor: 'white',
        background: 'white',
        zIndex: 9999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {children}
    </div>
  );
}

