"use client";

import dynamic from 'next/dynamic';

// Dynamically import client components with no SSR
const MusicProvider = dynamic(() => import("./demos/demo/MusicProvider"), { ssr: false });
const MusicDemo = dynamic(() => import("./demos/demo/demo").then(mod => ({ default: mod.MusicDemo })), { ssr: false });

export default function Home() {
  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      <main className="w-full min-h-screen">
        <MusicProvider song="/sound/demo1.mp3">
          <MusicDemo />
        </MusicProvider>

        <header className="fixed top-8 right-12 underline underline-offset-4 text-lg flex items-center justify-center gap-6 z-100 dark:text-white">
          <a
            className="flex items-center gap-2 hover:underline-offset-5"
            href="https://pockit.world/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pockit
          </a>
          <a
            className="flex items-center gap-2 hover:underline-offset-5"
            href="https://x.com/prnth_"
            target="_blank"
            rel="noopener noreferrer"
          >
            X
          </a>
        </header>
      </main>
    </div>
  );
}
