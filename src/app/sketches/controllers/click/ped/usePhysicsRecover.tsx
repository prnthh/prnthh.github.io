import { useRef, useEffect } from "react";
import { RapierRigidBody } from "@react-three/rapier";
import { Quaternion } from "three";
import { useFrame } from "@react-three/fiber";

const UPRIGHT_QUAT = new Quaternion();
const RECOVER_DURATION = 1.5;
const RECOVER_DELAY = 2; // seconds

const usePhysicsRecover = (
    rigidBodyRef: React.RefObject<RapierRigidBody | null>,
    setFallenOver: (v: boolean) => void,
    recover: boolean
) => {
    const recovering = useRef(false);
    const startQuat = useRef<Quaternion | null>(null);
    const elapsed = useRef(0);
    const delayTimeout = useRef<NodeJS.Timeout | null>(null);
    const shouldDisable = useRef(false);
    const shouldEnable = useRef(false);

    // Handle recover trigger and delay
    useEffect(() => {
        if (recover && !recovering.current && !delayTimeout.current) {
            delayTimeout.current = setTimeout(() => {
                const rigidBody = rigidBodyRef.current;
                if (!rigidBody) return;
                recovering.current = true;
                shouldDisable.current = true;
                const rot = rigidBody.rotation();
                startQuat.current = new Quaternion(rot.x, rot.y, rot.z, rot.w);
                elapsed.current = 0;
                delayTimeout.current = null;
            }, RECOVER_DELAY * 1000);
        }
        if (!recover && delayTimeout.current) {
            clearTimeout(delayTimeout.current);
            delayTimeout.current = null;
        }
        // Cleanup on unmount
        return () => {
            if (delayTimeout.current) {
                clearTimeout(delayTimeout.current);
                delayTimeout.current = null;
            }
        };
    }, [recover, rigidBodyRef]);

    // Tween recovery in useFrame
    useFrame((_, delta) => {
        if (recovering.current && rigidBodyRef.current) {
            elapsed.current += delta;
            const t = Math.min(elapsed.current / RECOVER_DURATION, 1);
            // Always slerp from current rotation to upright
            const rot = rigidBodyRef.current.rotation();
            const currentQuat = new Quaternion(rot.x, rot.y, rot.z, rot.w);
            const q = currentQuat.clone().slerp(UPRIGHT_QUAT, t);
            // Update rotation every frame
            rigidBodyRef.current.setRotation(q, false);
            if (t >= 1) {
                rigidBodyRef.current.setRotation(UPRIGHT_QUAT.clone(), false);
                shouldEnable.current = true;
                setFallenOver(false);
                recovering.current = false;
                startQuat.current = null;
            }
        }
    });

    // Side effects: setEnabled and setRotation outside physics step
    useEffect(() => {
        if (!rigidBodyRef.current) return;
        if (shouldDisable.current) {
            rigidBodyRef.current.setEnabled(false);
            shouldDisable.current = false;
        }
        if (shouldEnable.current) {
            rigidBodyRef.current.setEnabled(true);
            shouldEnable.current = false;
        }
    });
};

export default usePhysicsRecover;
