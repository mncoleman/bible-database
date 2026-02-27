"use client";

import Link from "next/link";
import { AnimatedBibleLogo } from "@/components/bible/animated-bible-logo";
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))', WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))', borderTop: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow-inset), 0 -2px 12px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-around h-14 px-2">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[4rem]",
                "transition-[color,opacity] duration-200 ease-out",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground active:opacity-60"
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
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[4rem]",
                "transition-[color,opacity] duration-200 ease-out",
                isMoreActive || moreOpen
                  ? "text-foreground"
                  : "text-muted-foreground active:opacity-60"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[0.625rem] leading-tight">More</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-48 p-1 bg-transparent border-[var(--glass-border)] shadow-[var(--glass-shadow-inset),0_4px_24px_rgba(0,0,0,0.12)]"
            sideOffset={12}
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(40px) saturate(var(--glass-saturate))',
              WebkitBackdropFilter: 'blur(40px) saturate(var(--glass-saturate))',
            }}
          >
            {moreMenuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg",
                    "transition-[background,color] duration-200 ease-out",
                    isActive
                      ? "bg-white/20 dark:bg-white/10 text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/15 dark:hover:bg-white/8 active:opacity-60"
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
      {/* Top header bar — Liquid Glass */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
          WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
          borderBottom: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow-inset), 0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <div className="container max-w-screen-xl px-4 mx-auto">
          <div className="flex h-14 items-center">
            {/* Left: Brand */}
            <Link href="/today" className="flex items-center gap-2 font-semibold text-lg shrink-0">
              <AnimatedBibleLogo className="h-7 w-7" />
              <span>Bible Tracker</span>
            </Link>

            {/* Center: Desktop nav — flex-1 centers the nav links */}
            <nav className="hidden md:flex items-center justify-center gap-1 flex-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-transparent transition-[background,box-shadow,color,border-color] duration-250 ease-out",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/20 dark:hover:bg-white/10"
                    )}
                    style={isActive ? {
                      background: 'var(--glass-bg)',
                      borderColor: 'var(--glass-border)',
                      boxShadow: 'var(--glass-shadow-inset), 0 1px 4px rgba(0,0,0,0.06)',
                    } : undefined}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right: Theme toggle */}
            <div className="flex items-center gap-2 ml-auto md:ml-0 shrink-0">
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
