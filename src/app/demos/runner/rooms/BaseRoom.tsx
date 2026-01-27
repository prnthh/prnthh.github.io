
import useGameStore, { allEntityIDsByType, useEntityById } from "@/shared/providers/GameEntityStore";
import { Group, Mesh, Box3, MeshPhongNodeMaterial } from "three/webgpu";
import AnimatedModel from "@/app/react-three-character/HumanoidModel";
import { Suspense, useEffect, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { color, float, reflector } from "three/tsl";
import { useThree } from "@react-three/fiber";

const Room = ({ playerRef, roomId }: { playerRef?: React.RefObject<Group>, roomId: string }) => {
    const room = useEntityById(roomId);
    const allRooms = allEntityIDsByType('room');

    if (!room) return null;

    const { variant = 0, config, position, index } = room;
    const effectiveWidth = config?.width ?? 5;
    const effectiveLength = config?.length ?? 10;

    // Get previous room for transition walls
    const prevRoomId = index > 0 ? allRooms[index - 1] : null;
    const prevRoom = prevRoomId ? useGameStore.getState().entities.find(e => e.id === prevRoomId) : null;

    const [rng,] = useState(() => Math.random()); // Stable random per room instance

    return <group position={position}>
        {/* <mesh position={[0, 2, 0]}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshBasicMaterial color={config?.floorColor} />
        </mesh> */}
        {/* <gridHelper
            args={[effectiveLength, effectiveLength, 'white', 'gray']}
            rotation={[0, 0, 0]}
            position={[0, 0.01, effectiveLength / 2]}
        /> */}
        <Suspense fallback={<TiledPlatform
            position={[0, 0, 0]}
            width={effectiveWidth}
            length={effectiveLength}
            floorColor={config?.floorColor}
        />}>
            <LazyWorld variant={variant} />
        </Suspense>
        <group >
            <Suspense fallback={null}>
                <AnimatedModel
                    rotation={[0, (rng > 0.5 ? -1 : 1) * Math.PI / 2, 0]}
                    position={[1.8 * (rng > 0.5 ? 1 : -1), 0, config?.length ? config.length - 2 : 8]}
                    scale={1.7}
                    lookTarget={playerRef}
                    basePath={"/models/human/rigga/"}
                    model={"/models/human/rigga/rigga.glb"}
                    // animation={'walk'}
                    animationOverrides={{
                        walk: '/models/human/anim/walk.fbx',
                        run: '/models/human/anim/run.fbx',
                        jump: '/models/human/anim/jump.fbx',
                    }}
                >
                </AnimatedModel>
            </Suspense>
        </group>



    </group >
}

export default Room;

const models = [
    // '/models/rooms/BaseRoad.glb',
    '/models/rooms/Road3.glb',
    '/models/rooms/Road.glb',
];

const LazyWorld = ({ variant = 0 }: { variant?: number }) => {
    const { scene } = useGLTF(models[variant % models.length]);
    const { scene: threeScene } = useThree();
    const ref = useRef<Group>(null);
    const [clone, setClone] = useState<Group | null>(null);
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        if (scene) {
            const clonedScene = scene.clone() as Group;

            // Create reflector for glass materials
            const reflection = reflector({ resolution: 0.5 });
            reflection.target.rotation.x = -Math.PI / 2;
            threeScene.add(reflection.target);

            clonedScene.traverse((child) => {
                if ((child as Mesh).isMesh) {
                    const mesh = child as Mesh;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;

                    // if material has userdata, replace it 
                    if (mesh.material && (mesh.material as any).userData && (mesh.material as any).userData.material) {
                        if ((mesh.material as any).userData.material === 'glass') {
                            mesh.material = new MeshPhongNodeMaterial({
                                transparent: true,
                                opacity: 0.3,
                                colorNode: reflection
                            });
                        }
                    }
                }
            });
            setClone(clonedScene);

            // Calculate offset based on bounding box to align start at z=0
            const bbox = new Box3().setFromObject(clonedScene);
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
            <meshBasicMaterial color={floorColor} />
        </mesh>
    </group>;
};

