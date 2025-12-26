"use client";

import { PrefabEditor } from "react-three-game";
import killbox from "../../tools/prefabeditor/samples/killbox.json";


export default function PrefabEditorPage() {
    return <div className="w-screen h-screen">
        <PrefabEditor initialPrefab={killbox}>
        </PrefabEditor>
    </div>
}
