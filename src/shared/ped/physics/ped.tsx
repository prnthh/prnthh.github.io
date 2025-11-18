import { memo, useRef, useState, Suspense, } from "react";
import RigidHumanoidModel from "./RigidHumanoidModel";
import SteeringBehavior, { SteeringType } from "./SelfSteeringBehavior";
import { RigidHumanoidModelProps, RigidHumanoidModelRef } from "./types";

export interface PedProps extends RigidHumanoidModelProps {
    position?: [number, number, number];
    steeringType?: SteeringType;
    onDestinationReached?: () => void;
    forwardRef?: (refs: RigidHumanoidModelRef) => void;
}

const Ped = memo(({
    position,
    steeringType = SteeringType.RUN,
    onDestinationReached,
    forwardRef,
    children,
    ...rigidHumanoidProps
}: PedProps) => {
    const modelRef = useRef<RigidHumanoidModelRef>(null);
    const [animation, setAnimation] = useState<"idle" | "walk" | "run">("idle");
    const [spawnPosition,] = useState<[number, number, number]>(position || [0, 0, 0]);

    return (
        <Suspense fallback={null}>
            <RigidHumanoidModel
                ref={modelRef}
                position={spawnPosition}
                animation={animation}
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
        </Suspense>
    );
});

export default Ped;