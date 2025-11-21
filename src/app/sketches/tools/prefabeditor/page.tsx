"use client";

import GameCanvas from "@/shared/GameCanvas";
import { useState, useRef, } from "react";
import { Group, } from "three";
import { Prefab, } from "./types";
import PrefabEditor from "./PrefabRoot";
import { Physics } from "@react-three/rapier";
import testPrefab from "./samples/test.json";

export default function PrefabEditorPage() {
    const [loadedPrefab, setLoadedPrefab] = useState<Prefab>(testPrefab as unknown as Prefab);
    const prefabRef = useRef<Group>(null);
    return <div className="w-screen h-screen">
        <GameCanvas>
            <Physics paused={true}>
                <ambientLight intensity={1.5} />
                <gridHelper args={[10, 10]} position={[0, -1, 0]} />
                <PrefabEditor editMode data={loadedPrefab} ref={prefabRef} />
            </Physics>

        </GameCanvas>
    </div>
}

