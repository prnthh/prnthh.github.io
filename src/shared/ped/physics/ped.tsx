import { memo, useCallback, useRef, useState, Suspense, useMemo } from "react";
import RigidHumanoidModel from "./RigidHumanoidModel";
import SteeringBehavior, { SteeringType } from "./SelfSteeringBehavior";
import { RigidHumanoidModelProps, RigidHumanoidModelRef } from "./types";
import PedRagdoll from "./PedRagdoll";
import { CuboidCollider } from "@react-three/rapier";

export interface PedProps extends RigidHumanoidModelProps {
    position?: [number, number, number];
    steeringType?: SteeringType;
    onDestinationReached?: () => void;
    /** If true, Ped will render a bullet-detecting hitbox and ragdoll on the first hit. */
    ragdollOnHit?: boolean;
    /** Force ragdoll state externally. Useful for scripted deaths or networking. */
    ragdolled?: boolean;
    forwardRef?: (refs: RigidHumanoidModelRef) => void;
}

const Ped = memo(({
    position,
    steeringType = SteeringType.RUN,
    onDestinationReached,
    ragdollOnHit = true,
    ragdolled,
    forwardRef,
    children,
    ...rigidHumanoidProps
}: PedProps) => {
    const modelRef = useRef<RigidHumanoidModelRef>(null);
    const [animation, setAnimation] = useState<"idle" | "walk" | "run">("idle");
    const [spawnPosition,] = useState<[number, number, number]>(position || [0, 0, 0]);
    const [internalRagdolled, setInternalRagdolled] = useState(false);
    const isRagdolled = ragdolled ?? internalRagdolled;

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
        const rb = modelRef.current?.rbref?.current;
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
    }, [isRagdolled, position, spawnPosition, rigidHumanoidProps]);

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
                    rbChildren={
                        ragdollOnHit ? (
                            <CuboidCollider
                                sensor
                                // Rough torso-sized sensor; tweak as needed per model
                                args={[0.25, 0.6, 0.25]}
                                position={[0, 0.9, 0]}
                                onIntersectionEnter={(e) => {
                                    // @ts-expect-error bullet userData is custom
                                    if (e.other.rigidBody?.userData?.type === "bullet") {
                                        enterRagdoll();
                                    }
                                }}
                            />
                        ) : undefined
                    }
                    {...rigidHumanoidProps}
                >
                    {children}
                    <SteeringBehavior
                        type={steeringType}
                        rigidBodyRef={modelRef}
                        setAnimation={setAnimation}
                        position={position || spawnPosition}
                        paused={false}
                        onDestinationReached={onDestinationReached}
                    />
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