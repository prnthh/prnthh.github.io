import MusicProvider from "./demos/demo/MusicProvider";
import { MusicDemo } from "./demos/demo/demo";

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
            href="https://x.com/prnth_"
            target="_blank"
            rel="noopener noreferrer"
          >
            X
          </a>
          <a
            className="flex items-center gap-2 hover:underline-offset-5"
            href="https://pockit.world/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pockit
          </a>
        </header>
      </main>

    </div >
  );
}
