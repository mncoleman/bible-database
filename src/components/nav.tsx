"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Calendar,
  CheckSquare,
  BarChart3,
  LineChart,
  Settings,
  MoreHorizontal,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/today", label: "Today", icon: BookOpen },
  { href: "/books", label: "Books", icon: BookOpen },
  { href: "/checklist", label: "Checklist", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/metrics", label: "Metrics", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Bottom nav: primary tabs
const bottomNavItems = [
  { href: "/today", label: "Today", icon: BookOpen },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

// "More" menu items (everything not in the bottom nav)
const moreMenuItems = [
  { href: "/books", label: "Books", icon: BookOpen },
  { href: "/checklist", label: "Checklist", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/metrics", label: "Metrics", icon: LineChart },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = moreMenuItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex items-center justify-around h-14 px-2">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors min-w-[4rem]",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[0.625rem] leading-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* More button with popover */}
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger asChild>
            <button
              aria-label="More navigation options"
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors min-w-[4rem]",
                isMoreActive || moreOpen
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[0.625rem] leading-tight">More</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-48 p-1"
            sideOffset={12}
          >
            {moreMenuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>
    </nav>
  );
}

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Top header bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-screen-xl px-4">
          <div className="grid grid-cols-[1fr_auto_1fr] h-14 items-center gap-4">
            {/* Left: Brand */}
            <Link href="/today" className="col-start-1 flex items-center gap-2 font-semibold text-lg">
              <Image
                src="/logo-light.svg"
                alt="Bible Logo"
                width={32}
                height={32}
                className="dark:hidden"
              />
              <Image
                src="/logo-dark.svg"
                alt="Bible Logo"
                width={32}
                height={32}
                className="hidden dark:block"
              />
              <span>Bible</span>
            </Link>

            {/* Center: Desktop nav */}
            <nav className="col-start-2 hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right: Theme toggle */}
            <div className="col-start-3 flex items-center gap-2 justify-end">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Bottom nav (mobile only) */}
      <BottomNav />
    </>
  );
}
