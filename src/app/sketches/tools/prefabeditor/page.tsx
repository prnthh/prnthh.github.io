"use client";

import { PrefabEditor } from "react-three-game";
import killbox from "../../tools/prefabeditor/samples/killbox.json";


export default function PrefabEditorPage() {
    return <div className="w-screen h-screen">
        <PrefabEditor initialPrefab={killbox}>
            <directionalLight position={[5, 10, 7.5]} intensity={1} castShadow />
        </PrefabEditor>
    </div>
}
