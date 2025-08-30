/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license
 */

import { useThree } from "@react-three/fiber";
import { RefObject } from "react";
import { useAudio } from "../../editor/scene/viewer/AudioProvider";
import { Vector3 } from "three";
import { useRapier } from "@react-three/rapier";
import * as THREE from "three";

export function useWeapon({ shoulderCamModeRef }: { shoulderCamModeRef: RefObject<boolean> }) {
    const { camera, scene } = useThree();
    const { rapier, world } = useRapier();
    const { unlockAudio, playSound, isUnlocked } = useAudio();

    const weaponHandler = () => {
        if (shoulderCamModeRef.current) {
            playSound("/sound/pistol.mp3");
            // raycast from camera to target
            // place a decal on the mesh that is hit
            if (camera) {
                const direction = new Vector3();
                camera.getWorldDirection(direction);
                const rayOrigin = camera.position;
                const ray = new rapier.Ray(rayOrigin, direction);
                const maxToi = 50;
                const hit = world.castRay(ray, maxToi, true, 8);

                console.log(hit);


                if (hit) {
                    const hitPoint = new Vector3(
                        camera.position.x + direction.x * hit.timeOfImpact,
                        camera.position.y + direction.y * hit.timeOfImpact,
                        camera.position.z + direction.z * hit.timeOfImpact
                    );
                    console.log(hitPoint);
                    // Place a decal at the hit point
                    const decal = new THREE.Mesh(
                        new THREE.SphereGeometry(0.03, 32),
                        new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 })
                    );
                    decal.rotation.x = Math.PI / 2;
                    decal.rotation.y = Math.PI / 2;
                    scene.add(decal);
                    decal.position.copy(hitPoint);

                    // add an impulse to the hit object
                    if (hit.collider) {
                        const impulse = direction.clone().normalize().multiplyScalar(5);
                        const rigidBody = hit.collider.parent();
                        if (rigidBody && typeof rigidBody.applyImpulse === "function") {
                            rigidBody.applyImpulse(impulse, true);
                        }
                    }
                }

            }
        }
    };

    return { weaponHandler };
}