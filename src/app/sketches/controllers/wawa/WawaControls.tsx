/**
 * WawaControls - Named after Wawa Sensei (wawasensei.dev) who invented this control scheme.
 * Adapted by prnth.com
 * 
 * Controls movement, rotation, and camera with a single input.
 * No separate keys for turning or camera rotation.
 */

import { RigidHumanoidModelRef } from "@/shared/ped/physics/types";
import { useInputStore } from "@/shared/providers/InputStore";
import { KeyboardInput } from "@/shared/firstperson/KeyboardInput";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, RefObject } from "react";
import { MathUtils, Vector3, Group } from "three";

const normalizeAngle = (angle: number): number => {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
};

const lerpAngle = (start: number, end: number, t: number): number => {
    start = normalizeAngle(start);
    end = normalizeAngle(end);

    if (Math.abs(end - start) > Math.PI) {
        if (end > start) {
            start += 2 * Math.PI;
        } else {
            end += 2 * Math.PI;
        }
    }

    return normalizeAngle(start + (end - start) * t);
};

interface WawaControlsProps {
    modelRef: RefObject<RigidHumanoidModelRef | null>;
    setAnimation: (animation: "idle" | "walk" | "run") => void;
    walkSpeed?: number;
    runSpeed?: number;
    rotationSpeed?: number;
}

const WawaControls = ({
    modelRef,
    setAnimation,
    walkSpeed = 1,
    runSpeed = 2.2,
    rotationSpeed = 0.01,
}: WawaControlsProps) => {
    const characterRotationTarget = useRef<number>(0);
    const rotationTarget = useRef<number>(0);
    const cameraTarget = useRef<Group>(null);
    const cameraPosition = useRef<Group>(null);
    const cameraWorldPosition = useRef<Vector3>(new Vector3());
    const cameraLookAtWorldPosition = useRef<Vector3>(new Vector3());
    const cameraLookAt = useRef<Vector3>(new Vector3());
    const inputState = useInputStore();
    const isClicking = useRef<boolean>(false);

    useEffect(() => {
        const onMouseDown = (e: MouseEvent | TouchEvent) => {
            isClicking.current = true;
        };
        const onMouseUp = (e: MouseEvent | TouchEvent) => {
            isClicking.current = false;
        };
        document.addEventListener("mousedown", onMouseDown);
        document.addEventListener("mouseup", onMouseUp);
        document.addEventListener("touchstart", onMouseDown);
        document.addEventListener("touchend", onMouseUp);
        return () => {
            document.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("touchstart", onMouseDown);
            document.removeEventListener("touchend", onMouseUp);
        };
    }, []);

    useEffect(() => {
        // Reset rigidbody rotation on mount
        const rb = modelRef.current?.rbref.current;
        if (rb) {
            rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
        }

        return () => {
            // Reset rotations on unmount
            const character = modelRef.current?.modelRef.current;
            const container = modelRef.current?.groupRef.current;
            if (character) {
                character.rotation.y = 0;
            }
            if (container) {
                container.rotation.y = 0;
            }
        };
    }, [modelRef]);

    useFrame(({ camera, mouse }) => {
        const rb = modelRef.current?.rbref.current;
        const character = modelRef.current?.modelRef.current;
        const container = modelRef.current?.groupRef.current;

        if (rb) {
            const vel = rb.linvel();

            const movement: { x: number; z: number } = {
                x: 0,
                z: 0,
            };

            if (inputState.vertical > 0) {
                movement.z = 1;
            }
            if (inputState.vertical < 0) {
                movement.z = -1;
            }

            let speed = inputState.sprint ? runSpeed : walkSpeed;

            if (isClicking.current) {
                if (Math.abs(mouse.x) > 0.1) {
                    movement.x = -mouse.x;
                }
                movement.z = mouse.y + 0.4;
                if (Math.abs(movement.x) > 0.5 || Math.abs(movement.z) > 0.5) {
                    speed = runSpeed;
                }
            }

            if (inputState.horizontal < 0) {
                movement.x = 1;
            }
            if (inputState.horizontal > 0) {
                movement.x = -1;
            }

            if (movement.x !== 0) {
                rotationTarget.current += rotationSpeed * movement.x;
            }

            if (movement.x !== 0 || movement.z !== 0) {
                characterRotationTarget.current = Math.atan2(movement.x, movement.z);
                vel.x =
                    Math.sin(rotationTarget.current + characterRotationTarget.current) *
                    speed;
                vel.z =
                    Math.cos(rotationTarget.current + characterRotationTarget.current) *
                    speed;
                if (speed === runSpeed) {
                    setAnimation("run");
                } else {
                    setAnimation("walk");
                }
            } else {
                setAnimation("idle");
            }

            if (character) {
                character.rotation.y = lerpAngle(
                    character.rotation.y,
                    characterRotationTarget.current,
                    0.1
                );
            }

            rb.setLinvel(vel, true);
        }

        // CAMERA
        if (container) {
            container.rotation.y = MathUtils.lerp(
                container.rotation.y,
                rotationTarget.current,
                0.1
            );
        }

        if (cameraPosition.current) {
            cameraPosition.current.getWorldPosition(cameraWorldPosition.current);
            camera.position.lerp(cameraWorldPosition.current, 0.1);
        }

        if (cameraTarget.current) {
            cameraTarget.current.getWorldPosition(cameraLookAtWorldPosition.current);
            cameraLookAt.current.lerp(cameraLookAtWorldPosition.current, 0.1);
            camera.lookAt(cameraLookAt.current);
        }
    });

    return (<>
        <KeyboardInput />
        <group ref={cameraTarget} position-z={1.5} />
        <group ref={cameraPosition} position-y={4} position-z={-4} />
    </>
    );
};

export default WawaControls;
