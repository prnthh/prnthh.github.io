import React, { useRef, useEffect, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

const KICK_IMPULSE_FRAME = 0.25;

interface CharacterProps {
    targetPosition: THREE.Vector3 | null;
    setTargetPosition: (pos: THREE.Vector3 | null) => void;
    targetCubeIndex: number | null;
    kickTargetPoint: THREE.Vector3 | null;
    kickNormal: THREE.Vector3 | null;
    setKickTargetPoint: (p: THREE.Vector3 | null) => void;
    setKickNormal: (n: THREE.Vector3 | null) => void;
    cubeBodyRefs: React.MutableRefObject<any[]>;
    controlsRef: React.MutableRefObject<any>;
    onKickReset: () => void;
    characterPositionRef: React.MutableRefObject<THREE.Vector3>;
}

const Character: React.FC<CharacterProps> = ({
    targetPosition,
    setTargetPosition,
    targetCubeIndex,
    kickTargetPoint,
    kickNormal,
    setKickTargetPoint,
    setKickNormal,
    cubeBodyRefs,
    controlsRef,
    onKickReset,
    characterPositionRef,
}) => {
    const [modelReady, setModelReady] = useState(false);
    const [kickImpulseApplied, setKickImpulseApplied] = useState(false);
    const [desiredRotationY, setDesiredRotationY] = useState<number | null>(null);
    const [readyToKick, setReadyToKick] = useState(false);

    const modelRef = useRef<THREE.Group>(null);

    // Load models and animations
    const model = useGLTF("/models/human/kachujin/Kachujin.glb");
    const kick = useGLTF("/models/human/kachujin/Kachujin@kick.glb");
    const walk = useGLTF("/models/human/kachujin/Kachujin@walking.glb");

    const { animations } = model;
    const { actions, mixer } = useAnimations(animations, modelRef);

    useEffect(() => {
        if (model.scene && kick.animations && walk.animations && modelRef.current) {
            model.scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.frustumCulled = false;
                    child.geometry.computeVertexNormals();
                }
            });
            // Add kick and walk animations
            actions["kick"] = mixer.clipAction(kick.animations[0], modelRef.current);
            walk.animations[0].tracks.shift(); // Remove forward movement track
            actions["walk"] = mixer.clipAction(walk.animations[0], modelRef.current);
            setModelReady(true);
        }
    }, [model, kick, walk, actions, mixer]);

    useFrame((state, delta) => {
        if (!modelReady || !modelRef.current) return;
        // Keep character position in sync with parent
        characterPositionRef.current.copy(modelRef.current.position);

        mixer.update(delta);

        // Smoothly rotate model to desiredRotationY if set
        if (desiredRotationY !== null) {
            const currentY = modelRef.current.rotation.y;
            let deltaY = desiredRotationY - currentY;
            deltaY = ((deltaY + Math.PI) % (2 * Math.PI)) - Math.PI;
            const rotateStep = 4 * delta * Math.sign(deltaY);
            if (Math.abs(deltaY) > 0.02) {
                modelRef.current.rotation.y += Math.abs(rotateStep) > Math.abs(deltaY) ? deltaY : rotateStep;
                return;
            } else {
                modelRef.current.rotation.y = desiredRotationY;
                setDesiredRotationY(null);
            }
        }

        // Walk to target position
        if (targetPosition) {
            const pos = modelRef.current.position;
            const distance = pos.distanceTo(targetPosition);
            if (distance > 0.08) {
                const direction = targetPosition.clone().sub(pos);
                direction.y = 0;
                if (direction.lengthSq() > 0.0001) {
                    const walkAngle = Math.atan2(direction.x, direction.z);
                    if (Math.abs(modelRef.current.rotation.y - walkAngle) > 0.02) {
                        setDesiredRotationY(walkAngle);
                        return;
                    }
                }
                modelRef.current.position.addScaledVector(direction.normalize(), 2 * delta);
                if (controlsRef.current) {
                    controlsRef.current.target.set(modelRef.current.position.x, modelRef.current.position.y + 1, modelRef.current.position.z);
                }
                if (actions["walk"] && !actions["walk"].isRunning()) {
                    actions["walk"].reset().fadeIn(0.2).play();
                }
            } else {
                setTargetPosition(null);
                if (actions["walk"] && actions["walk"].isRunning()) {
                    actions["walk"].fadeOut(0.2);
                }
                // Before kicking, face the kick target
                if (kickTargetPoint && modelRef.current) {
                    const pos = modelRef.current.position.clone();
                    pos.y = 0;
                    const kickDir = kickTargetPoint.clone().sub(pos);
                    kickDir.y = 0;
                    if (kickDir.lengthSq() > 0.0001) {
                        const kickAngle = Math.atan2(kickDir.x, kickDir.z);
                        if (Math.abs(modelRef.current.rotation.y - kickAngle) > 0.02) {
                            setDesiredRotationY(kickAngle);
                            setReadyToKick(true);
                            return;
                        }
                    }
                }
                setReadyToKick(true);
            }
        }

        // Play kick animation if ready
        if (readyToKick && actions["kick"]) {
            actions["kick"].reset().fadeIn(0.1).setLoop(THREE.LoopOnce, 1).play();
            setKickImpulseApplied(false);
            setReadyToKick(false);
        }

        // Apply impulse at the correct moment in the kick animation
        if (
            actions["kick"]?.isRunning() &&
            targetCubeIndex !== null &&
            !kickImpulseApplied
        ) {
            const action = actions["kick"];
            const time = action.time / action.getClip().duration;
            if (time > KICK_IMPULSE_FRAME) {
                setKickImpulseApplied(true);
                const cubeBody = cubeBodyRefs.current[targetCubeIndex];
                if (cubeBody && kickNormal) {
                    cubeBody.applyImpulse(
                        { x: -kickNormal.x * 50, y: 10, z: -kickNormal.z * 50 },
                        true
                    );
                }
            }
        }

        // Reset state after kick
        if (!actions["kick"]?.isRunning() && kickImpulseApplied) {
            setKickImpulseApplied(false);
            onKickReset();
        }
    });

    return <primitive object={model.scene} ref={modelRef} />;
};

export default Character;
