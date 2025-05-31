// Command parsing and execution helpers for DebugConsole
import useGameStore from "../gameStore";

export const COMMANDS = [
    "CREATE_ENTITY",
    "SELECT_ENTITY",
    "ADD_COMPONENT",
    "EDIT_COMPONENT",
    "SET_ANIMATION",
    "LOOK_AT",
    "HELP"
];

// Helper to get all possible completions for the current input
export function getCompletions(input: string, gameObjects: Record<string, any>): string[] {
    const trimmed = input.trim();
    if (trimmed === "") {
        // Show all commands if input is empty
        return COMMANDS;
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
        // Complete command
        return COMMANDS.filter(cmd => cmd.startsWith(parts[0].toUpperCase()));
    } else if (parts.length === 2) {
        // Complete entity id for SELECT_ENTITY, LOOK_AT, etc
        if (["SELECT_ENTITY", "LOOK_AT"].includes(parts[0].toUpperCase())) {
            return Object.keys(gameObjects).filter(id => id.startsWith(parts[1]));
        }
        // Complete component type for ADD_COMPONENT, EDIT_COMPONENT
        if (["ADD_COMPONENT", "EDIT_COMPONENT"].includes(parts[0].toUpperCase())) {
            const types = ["transform", "renderer", "collider", "3D_MODEL", "HAND_EQUIPMENT", "ACTOR", "ANIMATION", "LOOK_AT"];
            return types.filter(type => type.toUpperCase().startsWith(parts[1].toUpperCase()));
        }
    }
    return [];
}

// Main command execution logic
export function execCommand(command: string) {
    const store = useGameStore.getState();
    const addLog = store.addLog;
    const gameObjects = store.gameObjects;
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0]?.toUpperCase();

    switch (cmd) {
        case "CREATE_ENTITY": {
            const id = store.createGameObject({
                transform: {
                    position: [0, 0, 0],
                    rotation: [0, 0, 0],
                    scale: [1, 1, 1],
                    children: []
                }
            });
            addLog(`Created entity ${id}`);
            break;
        }
        case "SELECT_ENTITY": {
            const id = parts[1];
            if (gameObjects[id]) {
                store.selectedEntity = id;
                addLog(`Selected entity ${id}`);
            } else {
                addLog(`Entity ${id} not found`);
            }
            break;
        }
        case "ADD_COMPONENT": {
            const id = parts[1];
            const type = parts[2];
            if (gameObjects[id]) {
                if (type && type.toLowerCase() === "mesh") {
                    // ADD_COMPONENT <id> mesh [path]
                    const path = parts[3] || "/models/rigga.glb";
                    store.addComponent(id, "mesh", { path });
                    addLog(`Added mesh component to ${id} with path ${path}`);
                } else {
                    store.addComponent(id, type, {});
                    addLog(`Added component ${type} to ${id}`);
                }
            } else {
                addLog(`Entity ${id} not found`);
            }
            break;
        }
        case "REMOVE_COMPONENT": {
            const id = parts[1];
            const type = parts[2];
            if (gameObjects[id]) {
                store.removeComponent(id, type);
                addLog(`Removed component ${type} from ${id}`);
            } else {
                addLog(`Entity ${id} not found`);
            }
            break;
        }
        case "HELP": {
            addLog("Available commands: " + COMMANDS.join(", "));
            break;
        }
        default:
            addLog(`Unknown command: ${command}`);
    }
}
