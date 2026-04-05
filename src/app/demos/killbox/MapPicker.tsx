
"use client";

import { useRef, useState } from "react";
import { Prefab, } from "react-three-game";

// Import default maps
import killboxlobby from "../../tools/prefabeditor/samples/killboxlobby.json";
import killbox from "../../tools/prefabeditor/samples/killbox.json";
import test from "../../tools/prefabeditor/samples/killbox2.json";

const defaultMaps = {
    killbox: killbox as Prefab,
    killboxlobby: killboxlobby as Prefab,
    test: test as Prefab
};

type mapList = { [key: string]: Prefab };

function MapPicker({ onMapChange, maps = defaultMaps }: { onMapChange: (map: Prefab) => void, maps?: mapList }) {
    const [selectedMap, setSelectedMap] = useState<keyof typeof maps | 'custom'>("killboxlobby");
    const [customMap, setCustomMap] = useState<Prefab | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target?.result as string);
                    setCustomMap(json as Prefab);
                    setSelectedMap('custom');
                    onMapChange(json as Prefab);
                } catch (error) {
                    console.error('Failed to parse JSON:', error);
                    alert('Invalid JSON file');
                }
            };
            reader.readAsText(file);
        }
    };

    return <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 text-white flex gap-2">
        <select
            value={selectedMap}
            onChange={(e) => {
                const mapKey = e.target.value as keyof typeof maps | 'custom';
                setSelectedMap(mapKey);
                if (mapKey !== 'custom') {
                    onMapChange(maps[mapKey]);
                } else if (customMap) {
                    onMapChange(customMap);
                }
            }}
            className="px-2 py-1 bg-black/75 rounded"
        >
            {Object.keys(maps).map((key) => (
                <option key={key} value={key}>{key}</option>
            ))}
            {customMap && <option value="custom">Custom</option>}
        </select>
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
        />
        <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1 bg-black/75  rounded"
        >
            Upload JSON
        </button>
    </div>;
}

export default MapPicker;