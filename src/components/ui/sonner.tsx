"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-[#0a0a0a] group-[.toaster]:text-white group-[.toaster]:border-[#ff073a]/30",
          description: "group-[.toast]:text-white/70",
          actionButton: "group-[.toast]:bg-[#ff073a] group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-white/10 group-[.toast]:text-white/70",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4 text-[#ff073a]" />,
        info: <InfoIcon className="size-4 text-blue-400" />,
        warning: <TriangleAlertIcon className="size-4 text-yellow-400" />,
        error: <OctagonXIcon className="size-4 text-[#ff4569]" />,
        loading: <Loader2Icon className="size-4 animate-spin text-[#ff073a]" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
