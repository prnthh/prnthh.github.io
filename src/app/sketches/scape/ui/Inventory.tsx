import FakeServer from "../FakeServer";

export const InventoryUI = ({ playerId }: { playerId: string }) => {
    const inventory = FakeServer.getInventory(playerId);
    return (
        <div className="fixed bottom-4 right-4 w-[320px] bg-gray-800 bg-opacity-75 text-white p-4 rounded-lg shadow-lg">
            <h2 className="text-lg font-bold mb-2">Inventory</h2>
            <div className="grid grid-cols-4 gap-2">
                {Object.entries(inventory).map(([itemKey, count]) => (
                    <InventoryItem key={itemKey} itemKey={itemKey} count={count} />
                ))}
            </div>
        </div>
    );
}

const itemIcons: Record<string, React.ReactNode> = {
    bone: <span role="img" aria-label="bone">🦴</span>,
    gold: <span role="img" aria-label="gold">🪙</span>,
    wood: <span role="img" aria-label="wood">🪵</span>,
    stone: <span role="img" aria-label="stone">🪨</span>,
    // Add more mappings as needed
};

export const InventoryItem = ({ itemKey, count }: { itemKey: string, count: number }) => {
    const isStackable = itemKey === "gold";
    return (
        <div
            className="flex flex-col items-center justify-center bg-gray-700 rounded p-2 min-h-[60px] relative group"
            title={itemKey}
        >
            {isStackable && (
                <span className="absolute top-1 left-1 text-yellow-400 font-bold text-xs">
                    {count}
                </span>
            )}
            <div className="text-2xl mb-1">
                {itemIcons[itemKey] || <span role="img" aria-label="item">❓</span>}
            </div>
            <span className="text-xs truncate max-w-[48px]">{itemKey}</span>
            {/* For non-stackable items, show count only if > 1 */}
            {!isStackable && count > 1 && (
                <span className="absolute top-1 left-1 text-yellow-400 font-bold text-xs">
                    {count}
                </span>
            )}
        </div>
    );
}