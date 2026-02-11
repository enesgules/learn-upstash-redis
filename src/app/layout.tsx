import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NextStepButton from "@/components/ui/NextStepButton";
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
        <NextStepButton />
      </body>
    </html>
  );
}
