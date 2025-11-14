import { forwardRef, useRef, useImperativeHandle, useLayoutEffect, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { SceneCamera } from "./SceneCamera";
import * as THREE from "three";
import { Tween, Group as TweenGroup, Easing } from "@tweenjs/tween.js";

interface CutsceneCameraProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    duration?: number;
    fov?: number;
}

const CutsceneCamera = forwardRef<any, CutsceneCameraProps>(({
    position = [0, 0, 10],
    rotation,
    duration = 1500,
    fov = 75
}, ref) => {
    const sceneCameraRef = useRef<any>(null);
    const currentCamera = useThree((three) => three.camera);
    const tweenRef = useRef<Tween<any> | null>(null);
    const tweenGroupRef = useRef(new TweenGroup());

    // Clone both position and rotation from current camera
    const [startPosition] = useState(() => currentCamera.position.clone());
    const [startQuaternion] = useState(() => currentCamera.quaternion.clone());

    // Forward the ref to expose the camera
    useImperativeHandle(ref, () => sceneCameraRef.current);

    useLayoutEffect(() => {
        if (!sceneCameraRef.current?.cameraRef?.current) return;

        const camera = sceneCameraRef.current.cameraRef.current;

        // Set initial position and rotation from cloned camera
        camera.position.copy(startPosition);
        camera.quaternion.copy(startQuaternion);

        // Calculate target quaternion from rotation prop or use start quaternion
        const targetQuaternion = rotation
            ? new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2]))
            : startQuaternion.clone();

        // Setup tween
        const startState = {
            px: startPosition.x,
            py: startPosition.y,
            pz: startPosition.z,
            t: 0, // interpolation factor for quaternion
        };

        const endState = {
            px: position[0],
            py: position[1],
            pz: position[2],
            t: 1,
        };

        // Create and start the tween
        const tween = new Tween(startState, tweenGroupRef.current)
            .to(endState, duration)
            .easing(Easing.Quadratic.InOut)
            .onUpdate((state) => {
                camera.position.set(state.px, state.py, state.pz);
                // Use quaternion slerp for smooth rotation
                camera.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, state.t);
            });

        tweenRef.current = tween;
        tween.start();

        return () => {
            tween.stop();
        };
    }, [startPosition, startQuaternion, position, rotation, duration]);

    useFrame((state, delta) => {
        tweenGroupRef.current.update(performance.now());
    });

    return <SceneCamera ref={sceneCameraRef} fov={fov} />;
});

export default CutsceneCamera;