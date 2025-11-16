"use client";

import GameCanvas from "@/shared/GameCanvas";

export default function MapEditorPage() {
    return <div className="w-screen h-screen">
        <GameCanvas>
            <ambientLight intensity={1.5} />
            <gridHelper args={[10, 10]} position={[0, -1, 0]} />
        </GameCanvas>
    </div>
}

// refer to this for layout
// https://threejs.org/editor/

// lifecycle scripts like this:
// https://github.com/mrdoob/three.js/wiki/Editor-Manual

// should be able to load this json
// https://github.com/mrdoob/three.js/blob/dev/editor/examples/arkanoid.app.json