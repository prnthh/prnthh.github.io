import { CylinderCollider } from "@react-three/rapier";
import React, { useRef, useState, useEffect, DOMElement } from "react";

import { Html } from "@react-three/drei";

export default function DialogCollider() {
    const [dialogVisible, setDialogVisible] = useState(false);
    const height = 1.4; // Height of the cylinder collider
    const radius = 1; // Radius of the cylinder collider

    const handleIntersectionEnter = (event: any) => {
        const name = event?.other?.name || event?.other?.rigidBodyObject?.name
        if (name) setDialogVisible(true);
    };


    return <>
        <CylinderCollider
            args={[height / 2, radius]}
            position={[0, (height / 2), 0]}
            sensor
            onIntersectionEnter={handleIntersectionEnter}
            onIntersectionExit={() => setDialogVisible(false)}
        />
        {dialogVisible && <Html center position={[0, height * 1.1, 0]}>
            <div className="text-3xl text-yellow-300 text-center p-2 rounded drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
                hi
            </div>
        </Html>}
    </>
}