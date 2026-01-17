import { memo, useCallback, useRef, useState, Suspense, useMemo } from "react";
import RigidHumanoidModel from "./physics/RigidHumanoidModel";
import SteeringBehavior from "./physics/SelfSteeringBehavior";
import { PedProps, RigidHumanoidModelRef } from "./types";
import PedRagdoll from "./physics/PedRagdoll";

const Ped = memo(({
    position,
    onDestinationReached,
    enableRagdollOnHit = true,
    forceRagdoll,
    forwardRef,
    onBulletHit,
    children,
    ...rigidHumanoidProps
}: PedProps) => {
    const modelRef = useRef<RigidHumanoidModelRef>(null);
    const [animation, setAnimation] = useState<"idle" | "walk" | "run">("idle");
    const [spawnPosition,] = useState<[number, number, number]>(position || [0, 0, 0]);
    const [internalRagdolled, setInternalRagdolled] = useState(false);
    const isRagdolled = forceRagdoll ?? internalRagdolled;

    const [ragdollPose, setRagdollPose] = useState<{
        position: [number, number, number];
        rotation?: [number, number, number, number];
    } | null>(null);

    const modelPath = useMemo(() => {
        // RigidHumanoidModelProps extends AnimatedModelProps where `model` is the glb path.
        // We need to prepend basePath to get the full path for the ragdoll.
        const m = (rigidHumanoidProps as { model?: string }).model;
        const basePath = (rigidHumanoidProps as { basePath?: string }).basePath ?? "/models/human/";
        const modelRelPath = m ?? "onimilio/rigged.glb";
        return basePath + modelRelPath;
    }, [rigidHumanoidProps]);

    const enterRagdoll = useCallback(() => {
        if (isRagdolled) return;
        onBulletHit?.(); // Call the bullet hit callback
        const rb = modelRef.current?.rigidBodyRef?.current;
        if (rb) {
            const t = rb.translation();
            const r = rb.rotation();
            // Get height from props, default to 0.95
            const height = (rigidHumanoidProps as { height?: number }).height ?? 0.95;
            // Offset the ragdoll spawn position to the torso/hips level (approximately half the height)
            setRagdollPose({
                position: [t.x, t.y + height * 0.5, t.z],
                rotation: [r.x, r.y, r.z, r.w],
            });
        } else {
            const height = (rigidHumanoidProps as { height?: number }).height ?? 0.95;
            const pos = position || spawnPosition;
            setRagdollPose({ position: [pos[0], pos[1] + height * 0.5, pos[2]] });
        }
        setInternalRagdolled(true);
    }, [isRagdolled, position, spawnPosition, rigidHumanoidProps, onBulletHit]);

    return (
        <Suspense fallback={null}>
            {!isRagdolled && (
                <RigidHumanoidModel
                    ref={(r) => {
                        modelRef.current = r;
                        if (r) forwardRef?.(r);
                    }}
                    position={spawnPosition}
                    animation={animation}
                    onCollisionEnter={
                        enableRagdollOnHit
                            ? (e) => {
                                // @ts-expect-error bullet userData is custom
                                if (e.other.rigidBody?.userData?.type === "bullet") {
                                    enterRagdoll();
                                }
                            }
                            : undefined
                    }
                    {...rigidHumanoidProps}
                >
                    {children}

                    {position && (
                        <SteeringBehavior
                            debug={rigidHumanoidProps.debug}
                            rigidBodyRef={modelRef}
                            setAnimation={setAnimation}
                            position={position}
                            paused={false}
                            onDestinationReached={onDestinationReached}
                        />
                    )}
                </RigidHumanoidModel>
            )}

            {isRagdolled && ragdollPose && (
                <PedRagdoll
                    position={ragdollPose.position}
                    rotation={ragdollPose.rotation}
                    modelPath={modelPath}
                />
            )}
        </Suspense>
    );
});

export default Ped;