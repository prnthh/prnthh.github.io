import GameWithLoader from "@/app/sketches/loading/GameWithLoader";
import Game from "./Game";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameWithLoader>
                    <Game />
                </GameWithLoader>
            </div>
        </div>
    );
}