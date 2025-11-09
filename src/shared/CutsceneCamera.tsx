import { useThree } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import * as THREE from "three";

const CutsceneCamera = forwardRef((props, ref) => {
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const set = useThree((three) => three.set);
    const prevCamera = useThree((three) => three.camera);

    useImperativeHandle(ref, () => ({
        cameraRef: cameraRef,
        setActive: () => {

        }
    }));

    useLayoutEffect(() => {
        // if there's no current camera ref, exit early
        const current = cameraRef.current;
        if (!current) return;

        // store the previous camera to restore it when the effect cleans up
        const prev = prevCamera;

        // set the react three fiber camera to the current camera ref
        set(() => ({ camera: current }));

        // restore the previous camera when the effect cleans up
        return () => set(() => ({ camera: prev }));

        // don't include `prevCamera` in the dependency array so the effect keeps a reference to the default
    }, [cameraRef, set]);

    return <group>
        <perspectiveCamera
            ref={cameraRef}
            fov={75}
            position={[0, 2, 5]}
        />
    </group>
});

export default CutsceneCamera;