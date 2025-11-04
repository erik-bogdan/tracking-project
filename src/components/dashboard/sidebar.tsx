"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, CreditCard, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOutUser } from "@/lib/slices/authSlice";
import { useAppDispatch } from "@/lib/hooks";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Events",
    href: "/dashboard/events",
    icon: Calendar,
  },
  {
    name: "Plans",
    href: "/dashboard/plans",
    icon: CreditCard,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export function Sidebar({ isOpen, onClose, isMobile }: SidebarProps) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const handleSignOut = async () => {
    await dispatch(signOutUser());
    window.location.href = "/";
  };

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const content = (
    <>
      <div className="flex h-16 items-center border-b border-[#ff073a]/20 px-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#ff073a] via-[#ff1744] to-[#ff4569] bg-clip-text text-transparent">
          BeerPong Tracker
        </h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#ff073a]/20 text-white border border-[#ff073a]/30"
                  : "text-white/70 hover:bg-[#ff073a]/10 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[#ff073a]/20 p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-white/70 hover:text-white hover:bg-[#ff073a]/10"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className="flex h-screen flex-col bg-[#0a0a0a]">
        {content}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex h-screen flex-col border-r border-[#ff073a]/20 bg-[#0a0a0a] transition-all duration-300 overflow-hidden",
      isOpen ? "w-64" : "w-0"
    )}>
      {content}
    </div>
  );
}
