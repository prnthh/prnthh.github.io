import { useEffect, useRef, useState } from "react";
import { useRoom } from "./ColyseusProvider";


function JoinButton() {
    const { join, isConnecting, isConnected, joinError } = useRoom();
    if (isConnected) return null;
    return (
        <div className="flex flex-col items-center gap-2">
            <button onClick={join} disabled={isConnecting || isConnected} className="border px-4 py-2 rounded">
                {isConnecting ? "Connecting..." : isConnected ? "Connected" : "Join Room"}
            </button>
            {joinError && <div className="text-red-500">Failed to join room</div>}
        </div>
    );
}


export default function ChatBox() {
    const { room, isConnected, state } = useRoom();
    const [messages, setMessages] = useState<{ from: string; text: string }[]>([]);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // Listen for incoming chat messages
    useEffect(() => {
        if (!room) return;
        interface ChatMessage {
            from: string;
            text: string;
        }
        const chatHandler = (msg: ChatMessage) => setMessages((prev: ChatMessage[]) => [...prev, msg]);
        const commandHandler = (msg: ChatMessage) => setMessages((prev: ChatMessage[]) => [...prev, { ...msg, text: `[command] ${msg.text}` }]);
        const unsubChat = room.onMessage("chat", chatHandler);
        const unsubCommand = room.onMessage("command", commandHandler);
        return () => { unsubChat(); unsubCommand(); };
    }, [room]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && room) {
            if (input.startsWith("/")) {
                room.send("command", { text: input.slice(1) });
            } else {
                room.send("chat", { text: input });
            }
            setInput("");
        }
    };

    if (!isConnected) return <div className="absolute top-2 left-[50vw] -translate-x-1/2 p-2 flex bg-white text-black rounded"><JoinButton /></div>;

    return <div className="absolute bottom-2 left-2 p-2 flex bg-white text-black rounded">
        <div className="flex flex-col">
            <div className="border rounded p-2 h-48 overflow-y-auto">
                {messages.map((msg, i) => (
                    <div key={i}>
                        <span className="font-bold mr-2">
                            {state?.players?.[msg.from]?.name || msg.from || "?"}:
                        </span>
                        {msg.text}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="flex mt-2">
                <input
                    className="flex-1 border rounded px-2 py-1 mr-2"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type a message..."
                />
                <button type="submit" className="border px-4 py-1 rounded">Send</button>
            </form>
        </div>
        <PlayerList />
    </div>
}

function PlayerList() {
    const { state, isConnected } = useRoom();
    if (!isConnected || !state?.players) return null;
    const players = Array.isArray(state.players) ? state.players : Object.values(state.players);
    return (
        <div className="ml-1 border p-1">
            <h3 className="font-bold">Players:</h3>
            {players.map((player: any) => (
                <div key={player.id}>{player.name || player.id}</div>
            ))}
        </div>
    );
}