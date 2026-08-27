import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import "./repeak-theme.css";
import "@/components/om-primitives.css";
import { HubHeader } from "@/components/HubHeader";
import { ProfileProvider } from "@/lib/ProfileContext";
import dynamic from "next/dynamic";

const RepeakAiAssistant = dynamic(
  () => import("@/components/RepeakAiAssistant"),
  { ssr: false },
);

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Repeak Hub",
  description: "One login for Club, Brand, and Organizer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className="min-h-screen bg-canvas font-sans text-text-primary antialiased">
        <ProfileProvider>
          <HubHeader />
          {children}
          <RepeakAiAssistant />
        </ProfileProvider>
      </body>
    </html>
  );
}
