import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SoundToggle from "@/components/ui/SoundToggle";
import WelcomeButton from "@/components/ui/WelcomeButton";
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
  title: "Learn Upstash Redis",
  description:
    "Interactive 3D learning platform for Upstash Redis global replication concepts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <div className="fixed right-3 top-3 md:right-5 md:top-5 z-30 flex items-center gap-2">
          <SoundToggle />
          <WelcomeButton />
        </div>
      </body>
    </html>
  );
}
