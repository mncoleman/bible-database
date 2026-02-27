import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { Nav } from "@/components/nav";
import { Toaster } from "@/components/ui/sonner";
import { CustomColorProvider } from "@/components/custom-color-provider";
import { BeamsBackground } from "@/components/beams-background";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: {
    default: "Bible Tracker",
    template: "%s | Bible Tracker",
  },
  description: "Personal Bible reading tracker",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Bible Tracker",
    description: "Personal Bible reading tracker",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bible Tracker",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <CustomColorProvider />
            <BeamsBackground />
            <Nav />
            <main className="container max-w-screen-xl mx-auto px-4 py-6 pb-20 md:pb-6 overflow-x-hidden">
              <PageTransition>{children}</PageTransition>
            </main>
            <Toaster duration={2000} />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
