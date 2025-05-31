import React, { forwardRef, useImperativeHandle, useRef, useEffect } from "react";
import { RigidBody } from "@react-three/rapier";
import { MeshComponent } from "./components/MeshComponent";

// Props: gameObject, onRefsAvailable
const Entity = forwardRef(({ gameObject, onRefsAvailable }: any, ref) => {
    const rigidBodyRef = useRef<any>(null);
    const meshRef = useRef<any>(null);
    const notifiedRef = useRef<string | null>(null); // Track last notified id

    useImperativeHandle(ref, () => ({
        rigidBody: rigidBodyRef.current,
        mesh: meshRef.current,
    }), []);

    useEffect(() => {
        if (
            rigidBodyRef.current &&
            meshRef.current &&
            onRefsAvailable &&
            notifiedRef.current !== gameObject.id
        ) {
            onRefsAvailable(gameObject.id, {
                rigidBody: rigidBodyRef.current,
                mesh: meshRef.current,
            });
            notifiedRef.current = gameObject.id;
        }
    }, [gameObject.id, onRefsAvailable, meshRef.current, rigidBodyRef.current]);

    // --- Component pattern: render components if present ---
    const components = [];
    if (gameObject.components.mesh) {
        components.push(<MeshComponent key="mesh" ref={meshRef} meshComponent={gameObject.components.mesh} />);
    }
    // Example for future: if (gameObject.components.followCam) { components.push(<FollowCamComponent ... />); }

    return (
        <RigidBody ref={rigidBodyRef}>
            {components}
        </RigidBody>
    );
});

export default Entity;
