"use client";

import { useMemo } from "react";
import { PlaneGeometry } from "three";
import { OrbitControls, PerspectiveCamera, Plane } from "@react-three/drei";
import { GameCanvas } from "react-three-game";
import ShadedGround from "@/shared/ground/ShadedGround";

// floor materials
import { TextureSplatMaterial } from "@/shared/shaders/floor/TextureSplatMaterial";
import DetailedMaterial from "@/shared/shaders/floor/TexturedMaterial";
import { ShinyFloor } from "@/shared/shaders/floor/ShinyFloorMaterial";
const detailedMaterials = {
    "dirt": {
        map: '/textures/floor/terrain/dirt-512.jpg'
    },
    "sand": {
        map: '/textures/floor/terrain/sand-512.jpg'
    },
    "rocks": {
        map: '/textures/floor/rocks/gray_rocks_diff_1k.jpg',
        displacementMap: '/textures/floor/rocks/gray_rocks_disp_1k.png',
        normalMap: '/textures/floor/rocks/gray_rocks_nor_gl_1k.jpg',
        roughnessMap: '/textures/floor/rocks/gray_rocks_rough_1k.jpg',
    },
    "rocks2": {
        map: '/textures/floor/rocks2/aerial_rocks_04_diff_1k.jpg',
        displacementMap: '/textures/floor/rocks2/aerial_rocks_04_disp_1k.png',
        normalMap: '/textures/floor/rocks2/aerial_rocks_04_nor_gl_1k.jpg',
        roughnessMap: '/textures/floor/rocks2/aerial_rocks_04_rough_1k.jpg',
    }
}

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <ShadedGround position={[0, 0, -160]} />

                    <Plane rotation={[-Math.PI / 2, 0, 0]} position={[-32, 0, 16]} args={[32, 32, 256, 256]} receiveShadow>
                        <DetailedMaterial {...detailedMaterials["rocks"]} />
                    </Plane>

                    <Plane position={[0, 0, 16]} rotation={[-Math.PI / 2, 0, 0]} args={[32, 32, 256, 256]}>
                        <TextureSplatMaterial textureScale={8} />
                    </Plane>

                    <mesh position={[32, 0, 16]}>
                        <boxGeometry args={[32, 1, 32]} />
                        <ShinyFloor />
                    </mesh>

                    <TerrainPatch position={[0, 0, -16]}>
                        <DetailedMaterial {...detailedMaterials["sand"]} />
                    </TerrainPatch>

                    <VertexVisualizer geometry={new PlaneGeometry(32, 32, 16, 16)} />
                    <PlaygroundStatic position={[0, 0, 12]} />

                    <ambientLight intensity={0.5} />
                    <pointLight position={[0, 100, 0]} intensity={20000} />
                    <PerspectiveCamera makeDefault position={[0, 30, 60]} zoom={1} />
                    <OrbitControls />

                </GameCanvas>
            </div>
        </div>
    );
}

function VertexVisualizer({ geometry }: { geometry: PlaneGeometry }) {
    const instances = useMemo(() => {
        const arr: {
            key: string;
            position: [number, number, number];
        }[] = [];
        const pos = geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            arr.push({
                key: "vertex_" + i,
                position: [pos[i], pos[i + 1] + 2.5, pos[i + 2]] as [number, number, number],
            });
        }
        return arr;
    }, [geometry]);

    return (
        <group>
            {instances.map((instance) => (
                <mesh key={instance.key} position={instance.position} castShadow receiveShadow>
                    <boxGeometry args={[0.2, 0.2, 0.2]} />
                    <meshStandardMaterial color="red" />
                </mesh>
            ))}
        </group>
    );
}

function TerrainPatch({
    size = [32, 32],
    position = [0, 0, 0],
    children,
}: {
    size?: [number, number];
    position?: [number, number, number];
    children?: React.ReactNode;
}) {
    const width = size[0];
    const height = size[1];
    const tileSize = 4;
    const widthSegments = Math.floor(width / tileSize);
    const heightSegments = Math.floor(height / tileSize);

    const geometry = useMemo(() => {
        const nextGeometry = new PlaneGeometry(width, height, widthSegments, heightSegments);
        const positions = nextGeometry.attributes.position.array;

        for (let h = 0; h < heightSegments + 1; h += 1) {
            for (let w = 0; w < widthSegments + 1; w += 1) {
                const index = h * (widthSegments + 1) + w;
                positions[index * 3 + 2] = ((h + w) % 5) * Math.random() * 0.9;
            }
        }

        nextGeometry.computeVertexNormals();
        return nextGeometry;
    }, [height, heightSegments, width, widthSegments]);

    return (
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[-1, 1, 1]}
            position={position}
            geometry={geometry}
            castShadow
            receiveShadow
        >
            {children || <meshStandardMaterial color="limegreen" />}
        </mesh>
    );
}

const BALLS: Array<{
    key: string;
    position: [number, number, number];
    color: string;
    radius: number;
}> = [
        { key: "ball-skyblue", position: [-5, 5, 12], color: "skyblue", radius: 1.2 },
        { key: "ball-purple", position: [0, 5, 15], color: "purple", radius: 1 },
        { key: "ball-pink", position: [5, 5, 5], color: "pink", radius: 0.8 },
        { key: "ball-aqua", position: [-5, 5, 4], color: "aqua", radius: 0.6 },
        { key: "ball-peach", position: [2, 5, 10], color: "peachpuff", radius: 1.5 },
    ];

const LEFT_WALLS = Array.from({ length: 4 }, (_, index) => ({
    key: `left-wall-${index}`,
    position: [index * -2 - 15, 1 + index * 0.5, -5] as [number, number, number],
    size: [3, 2 + index * 0.5, 5] as [number, number, number],
}));

const RIGHT_WALLS = Array.from({ length: 4 }, (_, index) => ({
    key: `right-wall-${index}`,
    position: [index * -2 - 15, 1 + index * 0.5, 5] as [number, number, number],
    size: [3, 2 + index * 0.5, 5] as [number, number, number],
}));

const STAIRS = Array.from({ length: 10 }, (_, index) => ({
    key: `stairs-${index}`,
    position: [index * 1.5 - 9, -0.5 + index * 0.2, 2] as [number, number, number],
    size: [3, 3, 5] as [number, number, number],
}));

function PlaygroundStatic({ position = [0, 0, 0] as [number, number, number] }) {
    return (
        <group position={position}>
            <mesh position={[-15, 1, 0]} castShadow receiveShadow>
                <boxGeometry args={[20, 1, 20]} />
                <meshStandardMaterial color="#777" />
            </mesh>

            {LEFT_WALLS.map((wall) => (
                <mesh key={wall.key} position={wall.position} castShadow receiveShadow>
                    <boxGeometry args={wall.size} />
                    <meshStandardMaterial color="#ccc" />
                </mesh>
            ))}

            <mesh position={[-21, 3.5, 0]} castShadow receiveShadow>
                <boxGeometry args={[3, 1, 5]} />
                <meshStandardMaterial color="#ccc" />
            </mesh>

            {RIGHT_WALLS.map((wall) => (
                <mesh key={wall.key} position={wall.position} castShadow receiveShadow>
                    <boxGeometry args={wall.size} />
                    <meshStandardMaterial color="#ccc" />
                </mesh>
            ))}

            {STAIRS.map((step) => (
                <mesh key={step.key} position={step.position} castShadow receiveShadow>
                    <boxGeometry args={step.size} />
                    <meshStandardMaterial color="#777" />
                </mesh>
            ))}

            <mesh position={[9, -2, 0]} rotation={[0.2, 0, 0.1]} castShadow receiveShadow>
                <boxGeometry args={[5, 10, 5]} />
                <meshStandardMaterial color="purple" />
            </mesh>

            <mesh position={[14, 0, -3]} rotation={[0.2, 0, -0.1]} castShadow receiveShadow>
                <boxGeometry args={[5, 10, 5]} />
                <meshStandardMaterial color="skyblue" />
            </mesh>

            <mesh position={[15, -1, 5]} rotation={[-0.2, 0, 0.2]} castShadow receiveShadow>
                <boxGeometry args={[5, 10, 5]} />
                <meshStandardMaterial color="#f5dd90" />
            </mesh>

            <mesh position={[21, -1, 0]} rotation={[0.4, 0, 0.2]} castShadow receiveShadow>
                <boxGeometry args={[5, 10, 5]} />
                <meshStandardMaterial color="hotpink" />
            </mesh>

            {BALLS.map((ball) => (
                <mesh key={ball.key} position={ball.position} castShadow receiveShadow>
                    <sphereGeometry args={[ball.radius, 32, 32]} />
                    <meshStandardMaterial color={ball.color} />
                </mesh>
            ))}
        </group>
    );
}
