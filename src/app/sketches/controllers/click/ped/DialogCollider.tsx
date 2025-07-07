import { CylinderCollider } from "@react-three/rapier";
import React, { useRef, useState, useEffect, DOMElement } from "react";

import { Html } from "@react-three/drei";

export default function DialogCollider({
    children,
    height = 1.4,
    radius = 1,
    onEnter,
    onExit
}: {
    children?: React.ReactNode,
    height?: number,
    radius?: number,
    onEnter?: () => void,
    onExit?: () => void
}) {
    const [dialogVisible, setDialogVisible] = useState(false);

    const handleIntersectionEnter = (event: any) => {
        const name = event?.other?.name || event?.other?.rigidBodyObject?.name
        if (name == 'bob') {
            console.log("DialogCollider: Intersection Entered with", name);
            setDialogVisible(true);
            onEnter?.();
        }
    };


    return <>
        <CylinderCollider
            args={[height / 2, radius]}
            position={[0, (height / 2), 0]}
            sensor
            onIntersectionEnter={handleIntersectionEnter}
            onIntersectionExit={() => { setDialogVisible(false); onExit?.() }}
        />
        {dialogVisible && <Html position={[0, height * 1.1, 0]}>
            <div className="-translate-x-[50%] min-w-[300px] text-3xl text-yellow-300 text-center p-2 rounded drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
                {children || "Default Dialog Text"}
            </div>
        </Html>}
    </>
}