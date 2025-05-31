import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import { useRef } from "react";
import Window from "./window";


const Building = ({
    position = [0, 0, 0],
    size = [3, 2.2, 3],
}: {
    position?: [number, number, number],
    size?: [number, number, number],
}) => {
    const rigidBodyRef = useRef<RapierRigidBody>(null);

    const width = size[0];
    const height = size[1];
    const depth = size[2];

    return (
        <RigidBody
            ref={rigidBodyRef}
            type="fixed"
            position={[position[0], position[1] + height / 2, position[2]]}
        >
            <mesh>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial color="grey" />

                {/* Front face */}
                <Window position={[0, 0, depth / 2 + 0.01]} rotation={[0, 0, 0]} />

                {/* Back face */}
                <Window position={[0, 0, -(depth / 2 + 0.01)]} rotation={[0, Math.PI, 0]} />

                {/* Left face */}
                <Window position={[-(width / 2 + 0.01), 0, 0]} rotation={[0, -Math.PI / 2, 0]} />

                {/* Right face */}
                <Window position={[width / 2 + 0.01, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
            </mesh>
        </RigidBody >
    );
}

export default Building