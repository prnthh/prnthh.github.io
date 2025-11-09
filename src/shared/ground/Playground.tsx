import { RigidBody, useRapier } from "@react-three/rapier";
import { useEffect } from "react";
import Rapier from '@dimforge/rapier3d-compat';
import { PlaneGeometry } from "three";



const BALLS: Array<{
    position: [number, number, number];
    color: string;
    radius: number;
}> = [
        {
            position: [-5, 5, 12],
            color: 'skyblue',
            radius: 1.2,
        },
        {
            position: [0, 5, 15],
            color: 'purple',
            radius: 1,
        },
        {
            position: [5, 5, 5],
            color: 'pink',
            radius: 0.8,
        },
        {
            position: [-5, 5, 4],
            color: 'aqua',
            radius: 0.6,
        },
        {
            position: [2, 5, 10],
            color: 'peachpuff',
            radius: 1.5,
        },
    ];

export default function Playground({ position = [0, 0, 0] as [number, number, number] }) {
    return <group position={position}>
        {/* floor */}
        <Heightfield position={position} />

        {/* flat platform & misc obstacles */}
        <RigidBody type="fixed" position={[-15, 1, 0]} colliders="cuboid">
            <mesh castShadow receiveShadow>
                <boxGeometry args={[20, 1, 20]} />
                <meshStandardMaterial color="#777" />
            </mesh>
        </RigidBody>

        {[...Array(4)].map((_, i) => (
            <RigidBody
                key={String(i)}
                type="fixed"
                shape="cuboid"
                position={[i * -2 - 15, 1 + i * 0.5, -5]}
            >
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[3, 2 + i * 0.5, 5]} />
                    <meshStandardMaterial color="#ccc" />
                </mesh>
            </RigidBody>
        ))}

        <RigidBody type="fixed" position={[-21, 3.5, 0]} colliders="cuboid">
            <mesh castShadow receiveShadow>
                <boxGeometry args={[3, 1, 5]} />
                <meshStandardMaterial color="#ccc" />
            </mesh>
        </RigidBody>

        {[...Array(4)].map((_, i) => (
            <RigidBody
                key={String(i)}
                type="fixed"
                shape="cuboid"
                position={[i * -2 - 15, 1 + i * 0.5, 5]}
            >
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[3, 2 + i * 0.5, 5]} />
                    <meshStandardMaterial color="#ccc" />
                </mesh>
            </RigidBody>
        ))}

        {/* stairs */}
        {[...Array(10)].map((_, i) => (
            <RigidBody
                key={String(i)}
                type="fixed"
                shape="cuboid"
                position={[i * 1.5 - 9, -0.5 + i * 0.2, 2]}
            >
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[3, 3, 5]} />
                    <meshStandardMaterial color="#777" />
                </mesh>
            </RigidBody>
        ))}

        {/* pillars */}
        <RigidBody
            type="fixed"
            position={[9, -2, 0]}
            rotation={[0.2, 0, 0.1]}
            colliders="cuboid"
        >
            <mesh castShadow receiveShadow>
                <boxGeometry args={[5, 10, 5]} />
                <meshStandardMaterial color="purple" />
            </mesh>
        </RigidBody>

        <RigidBody
            type="fixed"
            position={[14, 0, -3]}
            rotation={[0.2, 0, -0.1]}
            colliders="cuboid"
        >
            <mesh castShadow receiveShadow>
                <boxGeometry args={[5, 10, 5]} />
                <meshStandardMaterial color="skyblue" />
            </mesh>
        </RigidBody>

        <RigidBody
            type="fixed"
            position={[15, -1, 5]}
            rotation={[-0.2, 0, 0.2]}
            colliders="cuboid"
        >
            <mesh castShadow receiveShadow>
                <boxGeometry args={[5, 10, 5]} />
                <meshStandardMaterial color="#f5dd90" />
            </mesh>
        </RigidBody>

        <RigidBody
            type="fixed"
            position={[21, -1, 0]}
            rotation={[0.4, 0, 0.2]}
            colliders="cuboid"
        >
            <mesh castShadow receiveShadow>
                <boxGeometry args={[5, 10, 5]} />
                <meshStandardMaterial color="hotpink" />
            </mesh>
        </RigidBody>

        {/* spinning boxes */}
        <RigidBody
            type="kinematicVelocity"
            position={[15, 3, 12]}
            rotation={[0, Math.PI / 2, 0]}
            angularVelocity={[0, 0, 1]}
            colliders="cuboid"
        >
            <mesh castShadow receiveShadow>
                <boxGeometry args={[6, 3, 3]} />
                <meshStandardMaterial color="pink" />
            </mesh>
        </RigidBody>

        <RigidBody
            type="kinematicVelocity"
            position={[15, 3, 20]}
            rotation={[0, Math.PI / 2, 0]}
            angularVelocity={[0, 0, 1]}
            colliders="cuboid"
        >
            <mesh castShadow receiveShadow>
                <boxGeometry args={[6, 5, 5]} />
                <meshStandardMaterial color="skyblue" />
            </mesh>
        </RigidBody>

        {/* balls */}
        {BALLS.map((ball, i) => (
            <RigidBody
                key={String(i)}
                type="dynamic"
                colliders="ball"
                position={ball.position}
                rotation={[0, Math.random() * Math.PI * 2, 0]}
            >
                <mesh castShadow receiveShadow>
                    <sphereGeometry args={[ball.radius, 32, 32]} />
                    <meshStandardMaterial color={ball.color} />
                </mesh>
            </RigidBody>
        ))}
    </group>;
}


const heightFieldDepth = 50;
const heightFieldWidth = 50;
const heightFieldArray = Array.from({
    length: heightFieldDepth * heightFieldWidth,
}).map((_, index) => {
    return Math.random();
});
const heightField = new Float32Array(heightFieldArray);

const heightFieldGeometry = new PlaneGeometry(
    heightFieldWidth,
    heightFieldDepth,
    heightFieldWidth - 1,
    heightFieldDepth - 1,
);

heightField.forEach((v, index) => {
    heightFieldGeometry.attributes.position.array[index * 3 + 2] = v;
});
heightFieldGeometry.scale(1, -1, 1);
heightFieldGeometry.rotateX(-Math.PI / 2);
heightFieldGeometry.rotateY(-Math.PI / 2);
heightFieldGeometry.computeVertexNormals();

const Heightfield = ({ position }: { position: [number, number, number] }) => {
    const { world } = useRapier();
    useEffect(() => {
        const heightfieldDesc = Rapier.ColliderDesc.heightfield(
            heightFieldWidth - 1,
            heightFieldWidth - 1,
            heightField,
            { x: heightFieldWidth, y: 1, z: heightFieldDepth },
        );

        const collider = world.createCollider(heightfieldDesc);
        collider.setTranslation({ x: position[0], y: position[1], z: position[2] });

        return () => {
            world.removeCollider(collider, false);
        };
    });

    return (
        <>
            <mesh geometry={heightFieldGeometry} receiveShadow>
                <meshStandardMaterial side={2} color="#444" />
            </mesh>
        </>
    );
};