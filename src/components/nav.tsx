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
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
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

          {/* Right: Theme toggle & mobile menu */}
          <div className="col-start-3 flex items-center gap-2 justify-end">
            <ThemeToggle />

            {/* Mobile nav */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <nav className="flex flex-col gap-2 mt-8">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                        pathname === item.href ||
                          pathname.startsWith(item.href + "/")
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
