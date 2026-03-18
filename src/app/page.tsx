import HomeGame from "@/app/demos/homepage/HomeGame";
import GameWithLoader from "@/app/sketches/loading/GameWithLoader";

export default function Home() {
  return (
    <div className="items-center justify-items-center min-h-screen">
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
      <div className="w-full" style={{ height: "100vh" }}>
        <GameWithLoader>
          <HomeGame />
        </GameWithLoader>
      </div>
    </div>
  );
}
