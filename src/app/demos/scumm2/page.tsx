import Game from "./Game";

export default function Scumm2Page() {
	return (
		<div className="items-center justify-items-center min-h-screen">
			<div className="w-full" style={{ height: "100vh" }}>
				<Game />
			</div>
		</div>
	);
}