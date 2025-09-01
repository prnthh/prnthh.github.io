import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import { Html } from "@react-three/drei";
import { useState } from "react";

const HitBox = ({ debug, children, position, ref, onHit }: { debug?: boolean; children?: React.ReactNode, position?: [number, number, number], ref?: React.Ref<RapierRigidBody>, onHit?: (hitCount: number) => void }) => {
    const [hitCount, setHitCount] = useState(0);

    return (
        <RigidBody position={position} ref={ref} type={hitCount > 0 ? "dynamic" : "fixed"} onIntersectionEnter={(e) => {
            console.log("Hit detected", hitCount);
            // @ts-expect-error custom property on bullet rigidbody
            if (e.other.rigidBody?.userData?.type === "bullet") {
                setHitCount((count) => count + 1);
                onHit?.(hitCount + 1);
            }
        }}>
            {children ?? <mesh castShadow>
                <boxGeometry args={[0.3, 0.3, 0.3]} />
                <meshStandardMaterial color={hitCount > 0 ? "orange" : "gray"} />
                {debug && <Html distanceFactor={1} transform position={[0, 0, 0]} center className="flex items-center justify-center bg-white w-[32px] h-[32px] rounded-full text-black">{hitCount}</Html>}
            </mesh>}
        </RigidBody>
    );
}
export default HitBox;