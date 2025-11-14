import { useEffect, useRef } from "react";
import * as THREE from "three/webgpu";

const BoundingBoxHelper = ({ children }: { children: React.ReactNode }) => {
    const groupRef = useRef<THREE.Group>(null);
    const helperRef = useRef<THREE.Box3Helper>(null);

    useEffect(() => {
        if (groupRef.current && helperRef.current) {
            const box = new THREE.Box3();
            box.setFromObject(groupRef.current);
            helperRef.current.box.copy(box);
        }
    });

    return <><group ref={groupRef}>
        {children}
    </group>
        <box3Helper ref={helperRef} args={[new THREE.Box3(), 0xffff00]} />
    </>;
}

export default BoundingBoxHelper;