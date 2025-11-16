
import useGameStore, { allEntityIDsByType, Entity, useEntityById } from "@/shared/providers/GameEntityStore";
import * as THREE from "three";
import AnimatedModel from "@/shared/ped/HumanoidModel";
import { Suspense, useEffect, useRef, useState } from "react";
import { useGLTF, useHelper } from "@react-three/drei";

const Room = ({ playerRef, roomId }: { playerRef?: React.RefObject<THREE.Group>, roomId: string }) => {
    const room = useEntityById(roomId);
    const allRooms = allEntityIDsByType('room');

    if (!room) return null;

    const { variant = 0, config, position, index } = room;
    const effectiveWidth = config?.width ?? 5;
    const effectiveLength = config?.length ?? 10;
    const wallHeight = config?.wallHeight ?? 4;

    // Get previous room for transition walls
    const prevRoomId = index > 0 ? allRooms[index - 1] : null;
    const prevRoom = prevRoomId ? useGameStore.getState().entities.find(e => e.id === prevRoomId) : null;

    const [rng,] = useState(() => Math.random()); // Stable random per room instance

    return <group position={position}>
        <Suspense fallback={null}>
            <LazyWorld />
        </Suspense>
        <group >
            <Suspense fallback={null}>
                <AnimatedModel
                    rotation={[0, (rng > 0.5 ? -1 : 1) * Math.PI / 2, 0]}
                    position={[1.8 * (rng > 0.5 ? 1 : -1), 0, config?.length ? config.length - 2 : 8]}
                    scale={1.7}
                    lookTarget={playerRef}
                    basePath={"/models/human/rigga/"}
                    model={"rigga.glb"}
                    // animation={'walk'}
                    animationOverrides={{
                        walk: 'anim/walk.fbx',
                        run: 'anim/run.fbx',
                        jump: 'anim/jump.fbx',
                    }}
                >
                </AnimatedModel>
            </Suspense>
        </group>

        <TiledPlatform
            position={[0, 0, 0]}
            width={effectiveWidth}
            length={effectiveLength}
            floorColor={config?.floorColor}
        />

    </group >
}

export default Room;

const LazyWorld = () => {
    const { scene } = useGLTF('/models/rooms/Road.glb');
    const ref = useRef<THREE.Group>(null);
    const [clone, setClone] = useState<THREE.Group | null>(null);
    const [offset, setOffset] = useState(0);
    useEffect(() => {
        if (scene) {
            const clonedScene = scene.clone() as THREE.Group;
            setClone(clonedScene);

            // Calculate offset based on bounding box to align start at z=0
            const bbox = new THREE.Box3().setFromObject(clonedScene);
            const offset = -bbox.min.z;
            setOffset(offset);
        }
    }, [scene]);

    if (!clone) return null;


    // useHelper(ref, THREE.BoxHelper, 'cyan')

    return <primitive ref={ref} object={clone} position={[0, 0, offset]} />;
}


const TiledPlatform = ({ position, width = 5, length = 10, height = 0.1, floorColor = "gray" }: { position: [number, number, number], width?: number, length?: number, height?: number, floorColor?: string }) => {
    // platform is centered on X, sits so top is at y=0, z is centered at length/2
    const yPos = -height / 2;
    const zPos = length / 2;
    return <group position={position}>
        <mesh receiveShadow castShadow position={[0, yPos, zPos]}>
            <boxGeometry args={[width, height, length]} />
            <meshStandardMaterial color={floorColor} />
        </mesh>
    </group>;
};

