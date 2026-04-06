import { useThree } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, ReactNode } from "react";
import * as THREE from "three";

interface SceneCameraProps {
    fov?: number;
    children?: ReactNode;
    initializeCamera?: (camera: THREE.PerspectiveCamera) => void;
}

export const SceneCamera = forwardRef<any, SceneCameraProps>(({
    fov = 75,
    children,
    initializeCamera,
}, ref) => {
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const set = useThree((three) => three.set);
    const prevCamera = useThree((three) => three.camera);
    const size = useThree((three) => three.size);

    useImperativeHandle(ref, () => ({
        cameraRef: cameraRef,
        setActive: () => {
            if (cameraRef.current) {
                set(() => ({ camera: cameraRef.current! }));
            }
        }
    }));

    useLayoutEffect(() => {
        const current = cameraRef.current;
        if (!current) return;

        initializeCamera?.(current);

        // Set proper aspect ratio and update projection matrix
        current.aspect = size.width / size.height;
        current.updateProjectionMatrix();

        // Store the previous camera to restore it when the effect cleans up
        const prev = prevCamera;

        // Set the react three fiber camera to the current camera ref
        set(() => ({ camera: current }));

        // Restore the previous camera when the effect cleans up
        return () => set(() => ({ camera: prev }));
    }, [initializeCamera, set, size, prevCamera]);

    return (
        <group>
            <perspectiveCamera
                ref={cameraRef}
                fov={fov}
                position={[0, 0, 0]}
            />
            {children}
        </group>
    );
});
