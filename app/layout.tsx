import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "AI Trip Planner",
  description: "An AI Trip Planner Powered by Agentbase",
  openGraph: {
    title: "AI Trip Planner",
    description: "Plan your next trip with AI — powered by Agentbase",
    url: "https://ai-trip-planner-pi-six.vercel.app",
    siteName: "AI Trip Planner",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "AI Trip Planner Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Trip Planner",
    description: "Plan your next trip with AI — powered by Agentbase",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
