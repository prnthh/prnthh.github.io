"use client";
import useGameStore from "../gameStore";
import { useRef, useState } from "react";
import { COMMANDS, getCompletions, execCommand } from "./debugConsoleCommands";

export default function DebugConsole() {
    const gameObjects = useGameStore((state) => state.gameObjects);
    const logs = useGameStore((state) => state.logs);
    const [input, setInput] = useState("");
    const [completions, setCompletions] = useState<string[]>([]);
    const [completionIdx, setCompletionIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleInput = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            execCommand(input.trim());
            setInput("");
            setCompletions([]);
            setCompletionIdx(0);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const currentCompletions = getCompletions(input, gameObjects);
            if (currentCompletions.length === 0) return;
            let idx = completionIdx;
            // If completions are empty or input changed, start from 0
            if (completions.length === 0 || completions.toString() !== currentCompletions.toString()) idx = 0;
            else idx = (completionIdx + 1) % currentCompletions.length;
            setCompletions(currentCompletions);
            setCompletionIdx(idx);
            // Replace the last word or fill input with the completion
            const trimmed = input.trim();
            const parts = trimmed.split(/\s+/);
            if (trimmed === "") {
                setInput(currentCompletions[idx] + " ");
            } else if (parts.length === 1) {
                setInput(currentCompletions[idx] + " ");
            } else {
                // Replace only the last part
                parts[parts.length - 1] = currentCompletions[idx];
                setInput(parts.join(" ") + (input.endsWith(" ") ? "" : " "));
            }
        } else {
            // Reset completions on any other key
            setCompletions([]);
            setCompletionIdx(0);
        }
    };

    return (
        <div className="absolute top-2 right-2 w-[320px] max-h-[500px] bg-black text-white p-4 flex flex-col z-10 rounded shadow-lg" >
            <strong>Game Store</strong>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, maxHeight: 120, overflow: "auto" }}>
                {(() => {
                    const seen = new Set();
                    return JSON.stringify(gameObjects, (key, value) => {
                        if (
                            key === "rigidBody" ||
                            key === "mesh" ||
                            key === "collider" ||
                            typeof value === "object" && value !== null && (typeof value === "function" || (typeof HTMLElement !== "undefined" && value instanceof HTMLElement))
                        ) {
                            return "[ref]";
                        }
                        if (typeof value === "object" && value !== null) {
                            if (seen.has(value)) return "[circular]";
                            seen.add(value);
                        }
                        return value;
                    }, 2);
                })()}
            </pre>
            <div className="w-full mt-2">
                <div className="font-mono text-xs mb-1">Terminal</div>
                <div className="bg-gray-900 rounded p-2 mb-1 h-24 overflow-auto text-xs" style={{ maxHeight: 96 }}>
                    {logs.map((log, idx) => (
                        <div key={idx} className="whitespace-pre-wrap">{log}</div>
                    ))}
                </div>
                <form onSubmit={handleInput} className="flex">
                    <span className="text-green-400 pr-1">$</span>
                    <input
                        ref={inputRef}
                        className="flex-1 bg-transparent border-none outline-none text-white text-xs"
                        value={input}
                        onChange={e => { setInput(e.target.value); setCompletions([]); setCompletionIdx(0); }}
                        onKeyDown={handleKeyDown}
                        autoComplete="off"
                        spellCheck={false}
                        style={{ minWidth: 0 }}
                        placeholder="Type a command..."
                    />
                </form>
                {completions.length > 0 && (
                    <div className="bg-gray-800 text-xs rounded mt-1 p-1 max-h-20 overflow-auto">
                        {completions.map((c, i) => (
                            <div key={c} className={i === completionIdx ? "bg-gray-600" : ""}>{c}</div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
