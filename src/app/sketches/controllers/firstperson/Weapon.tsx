/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license
 */

import { useThree, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from "three";
import { useRapier, RapierRigidBody } from "@react-three/rapier";
import useInputStore from "../controls/InputStore";

export function Weapon({ excludeRigidBody, onFire }: { excludeRigidBody?: React.RefObject<RapierRigidBody | null>, onFire?: () => void } = {}) {
    const { camera, scene } = useThree();
    const { rapier, world } = useRapier();
    const fire = useInputStore(state => state.fire);
    const prevFireRef = useRef(false);
    const audioPoolRef = useRef(Array.from({ length: 5 }, () => new Audio('/sound/pistol.mp3')));
    const audioIndexRef = useRef(0);

    function addSensorBullet({ position }: { position: Vector3 }) {
        const size = 0.01;

        const geometry = new SphereGeometry(size, 8, 8);
        const material = new MeshStandardMaterial({ color: Math.floor(Math.random() * 0xFFFFFF) });

        const mesh = new Mesh(geometry, material);
        mesh.castShadow = true;

        mesh.position.set(position.x, position.y, position.z);

        scene.add(mesh);

        //parameter 2 - mass, parameter 3 - restitution ( how bouncy )
        // Create a Rapier rigid body and collider for the mesh 
        const rigidBodyDesc = rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(mesh.position.x, mesh.position.y, mesh.position.z)
        const rigidBody = world.createRigidBody(rigidBodyDesc);
        const colliderDesc = rapier.ColliderDesc.ball(size).setSensor(true);
        const collider = world.createCollider(colliderDesc, rigidBody);
        // Enable collision detection with fixed, kinematic, and other kinematic bodies
        collider.setActiveCollisionTypes(
            rapier.ActiveCollisionTypes.DEFAULT |
            rapier.ActiveCollisionTypes.KINEMATIC_FIXED |
            rapier.ActiveCollisionTypes.KINEMATIC_KINEMATIC
        );
        mesh.userData.rigidBody = rigidBody;
        rigidBody.userData = { mesh, type: "bullet" };

        setTimeout(() => {
            scene.remove(mesh);
            world.removeRigidBody(rigidBody);
        }, 1000);
    }

    const weaponHandler = () => {
        // playSound("/sound/pistol.mp3");
        // raycast from camera to target
        // place a decal on the mesh that is hit
        if (camera) {
            const direction = new Vector3();
            camera.getWorldDirection(direction);

            // Get the actual world position of the camera
            const rayOrigin = new Vector3();
            camera.getWorldPosition(rayOrigin);

            const ray = new rapier.Ray(rayOrigin, direction);
            const maxToi = 50;

            // Exclude the player's own collider from the raycast
            const playerRb = excludeRigidBody?.current;
            const hit = world.castRay(
                ray,
                maxToi,
                true,
                undefined,
                undefined,
                undefined,
                playerRb || undefined
            );

            if (hit) {
                const hitPoint = new Vector3(
                    rayOrigin.x + direction.x * hit.timeOfImpact,
                    rayOrigin.y + direction.y * hit.timeOfImpact,
                    rayOrigin.z + direction.z * hit.timeOfImpact
                );

                // correct syntax for decals:
                // const m = new THREE.Mesh(new DecalGeometry(mesh, position, orientation, size), material);
                // m.renderOrder = decals.length; // give decals a fixed render order
                // decals.push(m);
                // mesh.attach(m);

                // add an impulse to the hit object
                if (hit.collider) {
                    const impulse = direction.clone().normalize().multiplyScalar(0.1);
                    const rigidBody = hit.collider.parent();
                    if (rigidBody && typeof rigidBody.applyImpulseAtPoint === "function") {
                        addSensorBullet({ position: hitPoint });
                        setTimeout(() => {
                            // tiny delay so bullet has time to register hit
                            rigidBody.applyImpulseAtPoint(impulse, hitPoint, true);
                        }, 1);
                    }
                }
            }

        }
    };

    useFrame(() => {
        if (fire && !prevFireRef.current) {
            weaponHandler();
            onFire?.();
            const audio = audioPoolRef.current[audioIndexRef.current];
            audio.currentTime = 0;
            audio.play().catch(() => { });
            audioIndexRef.current = (audioIndexRef.current + 1) % audioPoolRef.current.length;
        }
        prevFireRef.current = fire;
    });

    return null;
}

export function Gun({ isFlashing = false }: { isFlashing?: boolean }) {
    return <mesh rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.1, 1]} />
        <meshStandardMaterial color={isFlashing ? "red" : "black"} emissive={isFlashing ? "red" : "black"} emissiveIntensity={isFlashing ? 2 : 0} />
    </mesh>
}