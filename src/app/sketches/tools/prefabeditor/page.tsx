"use client";

import { PrefabEditor } from "react-three-game";
import prefabToEdit from "../../tools/prefabeditor/samples/room.json";


export default function PrefabEditorPage() {
    return <div className="w-screen h-screen">
        <PrefabEditor initialPrefab={prefabToEdit}>
        </PrefabEditor>
    </div>
}
