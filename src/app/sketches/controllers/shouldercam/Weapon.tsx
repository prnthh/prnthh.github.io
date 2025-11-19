/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license
 */

import { useThree, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import { useRapier } from "@react-three/rapier";
import * as THREE from "three";
import useInputStore from "@/shared/providers/InputStore";

export function Weapon() {
    const { camera, scene } = useThree();
    const { rapier, world } = useRapier();
    const tapSignal = useInputStore(state => state.tapSignal);
    const prevTapSignalRef = useRef(0);

    function addSensorBullet({ position }: { position: Vector3 }) {
        const size = 0.01;

        const geometry = new THREE.SphereGeometry(size, 8, 8);
        const material = new THREE.MeshStandardMaterial({ color: Math.floor(Math.random() * 0xFFFFFF) });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;

        mesh.position.set(position.x, position.y, position.z);

        scene.add(mesh);

        //parameter 2 - mass, parameter 3 - restitution ( how bouncy )
        // Create a Rapier rigid body and collider for the mesh 
        const rigidBodyDesc = rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(mesh.position.x, mesh.position.y, mesh.position.z)
        const rigidBody = world.createRigidBody(rigidBodyDesc);
        const colliderDesc = rapier.ColliderDesc.ball(size).setSensor(true);
        const collider = world.createCollider(colliderDesc, rigidBody);
        collider.setActiveCollisionTypes(rapier.ActiveCollisionTypes.DEFAULT | rapier.ActiveCollisionTypes.KINEMATIC_FIXED);
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
            const hit = world.castRay(ray, maxToi, true, 8);

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
        // Check if tap signal has changed (new tap occurred)
        if (tapSignal !== prevTapSignalRef.current) {
            prevTapSignalRef.current = tapSignal;
            weaponHandler();
        }
    });

    return null;
}