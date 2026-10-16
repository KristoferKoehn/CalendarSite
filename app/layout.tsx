import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/lib/session/session-context";
import { themeBootstrapScript } from "@/lib/theme-bootstrap";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CalendarSite",
  description: "Appointment scheduling",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      // The bootstrap script sets the theme class on this element before paint, so the server's
      // markup and the DOM disagree by exactly that one class. Without this React reports it as a
      // hydration mismatch and discards the server HTML.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Blocking, and deliberately so. It has to run before the first paint or the wrong theme
            is shown briefly; deferring it to React would guarantee that flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript() }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
