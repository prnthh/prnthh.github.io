
import useGameStore, { allEntityIDsByType, Entity, useEntityById } from "@/shared/providers/GameEntityStore";
import * as THREE from "three";
import AnimatedModel from "@/shared/ped/HumanoidModel";
import { Suspense } from "react";

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

    return <group position={position}>

        <group >
            <Suspense fallback={null}>
                <AnimatedModel
                    rotation={[0, Math.PI, 0]}
                    position={[2, 0, 8]}
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

