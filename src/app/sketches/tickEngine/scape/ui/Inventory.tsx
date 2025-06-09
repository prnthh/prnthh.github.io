import { useState } from "react";
import FakeServer from "../ScapeServer";

const UI_PATH = '/ui/';

export const InventoryUI = ({ playerId }: { playerId: string }) => {
    const inventory = FakeServer.getInventory(playerId);
    const [selectedTab, setSelectedTab] = useState<string | undefined>('inventory');

    return (
        <div className="fixed bottom-4 right-4 flex flex-col items-reverse z-50">
            {selectedTab == 'inventory' && <div className="bg-red-900/70 mb-2 p-1 rounded shadow-lg min-h-[200px] max-h-[400px] overflow-y-auto border-2 border-gray-800">
                <div className="grid grid-cols-4 gap-0.5">
                    {Object.entries(inventory).map(([itemKey, count]) => (
                        <InventoryItem key={itemKey} itemKey={itemKey} count={count} />
                    ))}
                </div>
            </div>}
            <div className="flex items-center justify-end gap-1">
                {['stats', 'quests', 'inventory', 'options', 'music', 'logout'].map((tab) => (
                    <button
                        key={tab}
                        className="flex items-center justify-center relative w-8 h-8 cursor-pointer hover:brightness-75 transition-all"
                        onClick={() => setSelectedTab(selectedTab == tab ? undefined : tab)}
                        title={tab.charAt(0).toUpperCase() + tab.slice(1)}
                    >
                        <img src={selectedTab === tab ? `${UI_PATH}tab_stone_middle_selected.png` : `${UI_PATH}tab_stone_middle.png`} alt={tab} className="fixed w-8" />
                        <img src={`${UI_PATH}${tab}.png`} alt={tab} className="fixed w-6 h-6" />

                    </button>
                ))}
            </div>
        </div>
    );
}

const itemIcons: Record<string, React.ReactNode> = {
    bone: <span role="img" aria-label="bone">🦴</span>,
    gold: <span role="img" aria-label="gold">🪙</span>,
    heart_log: <span role="img" aria-label="wood">🪵</span>,
    copper_ore: <span role="img" aria-label="stone">🪨</span>,
    // Add more mappings as needed
};

export const InventoryItem = ({ itemKey, count }: { itemKey: string, count: number }) => {
    const isStackable = itemKey === "gold";
    return (
        <button
            className="flex flex-col items-center justify-center h-[50px] w-[50px] relative group hover:bg-gray-800/30 rounded"
            title={itemKey}
        >
            <span className="absolute top-1 left-1 text-yellow-400 font-bold text-xs">
                {count}
            </span>
            <div className="text-2xl">
                {itemIcons[itemKey] || <span role="img" aria-label="item">❓</span>}
            </div>
        </button>
    );
}