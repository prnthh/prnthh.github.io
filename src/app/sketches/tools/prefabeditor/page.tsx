"use client";

import { PrefabEditor, registerComponent } from "react-three-game";
import prefabToEdit from "../../tools/prefabeditor/samples/killboxlobby.json";
import RotatorComponent from "./plugins/RotatorComponent";

registerComponent(RotatorComponent);

export default function PrefabEditorPage() {
    return <div className="w-screen h-screen">
        <PrefabEditor initialPrefab={prefabToEdit}>
        </PrefabEditor>
    </div>
}
