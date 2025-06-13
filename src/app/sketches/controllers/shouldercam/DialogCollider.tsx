import { CylinderCollider } from "@react-three/rapier";
import React, { useRef, useState, useEffect, DOMElement } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";


export default function DialogCollider({ children, htmlText = "Hello!", debug, dialog }: { children?: React.ReactNode, htmlText?: string, debug?: boolean, dialog?: React.ReactElement }) {
    // Use a group ref to wrap the children
    const groupRef = useRef<THREE.Group>(null);
    const childRef = useRef<THREE.Object3D>(null);
    const { camera, gl } = useThree();
    const [active, setActive] = useState(false);
    const [position, setPosition] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

    const height = 1.4;
    const radius = 2;

    // Handler for collision events
    const handleIntersectionEnter = (event: any) => {
        // Try to get the name from the colliding object
        const name = event?.other?.name || event?.other?.rigidBodyObject?.name
        if (name) setActive(true);
    };

    // Track last update time
    const lastUpdateRef = useRef<number>(0);

    useFrame((_, delta) => {
        lastUpdateRef.current += delta;
        if (lastUpdateRef.current >= 3) {
            if (groupRef.current && groupRef.current.children.length > 0) {
                const child = groupRef.current.children[0];
                if (child instanceof THREE.Object3D) {
                    const worldPos = new THREE.Vector3();
                    child.getWorldPosition(worldPos);
                    setPosition(worldPos.clone());
                }
            }
            lastUpdateRef.current = 0;
        }
    });

    return (
        <>
            <CylinderCollider
                sensor
                args={[height / 2, radius]}
                position={[position.x, position.y + (height / 2), position.z]}
                rotation={[0, 0, 0]}
                onIntersectionEnter={handleIntersectionEnter}
                onIntersectionExit={() => setActive(false)}
            >
                {active && (<Html center position={[0, height / 2, 0]}>
                    {dialog ?? <div className="text-3xl text-yellow-300 text-center p-2 rounded drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
                        {htmlText}
                    </div>}
                </Html>
                )}

            </CylinderCollider>
            {debug && <mesh position={[position.x, position.y + (height / 2), position.z]} rotation={[0, 0, 0]}>
                <cylinderGeometry args={[radius, radius, height, 32]} />
                <meshStandardMaterial color="blue" wireframe />
            </mesh>}
            <group ref={groupRef}>
                {children}
            </group>

        </>
    );
}