import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "./Nav";
import { GoogleAnalytics } from '@next/third-parties/google';

export const metadata: Metadata = {
  title: "prnth - graphics demos",
  description: "A collection of web based graphics demos and experiments by prnth.",
};

export const viewport: Viewport = {
  width: "device-width",
  viewportFit: "cover",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en text-black dark:text-white">
      <body
        className="antialiased bg-white dark:bg-black text-black dark:text-white transition-colors duration-500 ease-in-out"
      >
        {children}
        <Nav />
      </body>
      <GoogleAnalytics gaId="G-ZPS50VC97K" />
    </html>
  );
}
