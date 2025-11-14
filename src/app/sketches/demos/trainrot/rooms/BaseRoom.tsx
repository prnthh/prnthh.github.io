
import useGameStore, { allEntityIDsByType, Entity, useEntityById } from "@/shared/providers/GameStore";
import * as THREE from "three";
import AnimatedModel from "@/shared/ped/HumanoidModel";
import DialogCollider from "@/shared/ped/DialogCollider";
import CutsceneCamera from "@/shared/cameras/CutsceneCamera";

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
        <group>
            <AnimatedModel
                rotation={[0, -Math.PI / 2, 0]}
                position={[2, 0, 3]}
                scale={1.7}
                lookTarget={playerRef}
                basePath={"/models/human/rigga/"}
                model={"rigga.glb"}
                // animation={'walk'}
                animationOverrides={{
                    walk: 'anim/walk.fbx',
                    run: 'anim/run.fbx',
                    jump: 'anim/jump.fbx',
                }} />
        </group>
        <group >
            <AnimatedModel
                rotation={[0, Math.PI / 2, 0]}
                position={[-2, 0, 3]}
                scale={1.7}
                lookTarget={playerRef}
                basePath={"/models/human/rigga/"}
                model={"rigga.glb"}
                // animation={'walk'}
                animationOverrides={{
                    walk: 'anim/walk.fbx',
                    run: 'anim/run.fbx',
                    jump: 'anim/jump.fbx',
                }} />
        </group>

        <group >
            <AnimatedModel
                rotation={[0, Math.PI, 0]}
                position={[0, 0, 8]}
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
                <DialogCollider
                    height={1.9}
                    sceneChildren={<CutsceneCamera position={[-0.2, 2, -2]} rotation={[0.2, Math.PI, 0]} />}
                >
                    hello there
                </DialogCollider>
            </AnimatedModel>
        </group>


        <VisualSection
            position={[0, 0, 0]}
            width={effectiveWidth}
            length={effectiveLength}
            wallHeight={wallHeight}
            wallColor={config?.wallColor}
            prevRoom={prevRoom}
        />
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


const VisualSection = ({ position, width = 5, length = 10, wallHeight = 4, wallThickness = 0.1, wallColor = "lightgray", prevRoom }: { position: [number, number, number], width?: number, length?: number, wallHeight?: number, wallThickness?: number, wallColor?: string, prevRoom?: Entity | null }) => {
    const xPos = width / 2;
    const yPos = wallHeight / 2;
    const zPos = length / 2;

    const prevWidth = prevRoom?.config?.width ?? width;
    const prevWallHeight = prevRoom?.config?.wallHeight ?? wallHeight;
    const doorwayWidth = Math.min(prevWidth, width);
    const doorwayHeight = Math.min(prevWallHeight, wallHeight);
    const wallSectionWidth = (width - doorwayWidth) / 2;
    const topWallHeight = wallHeight - doorwayHeight;

    return <group position={position}>
        {/* Side walls */}
        <mesh position={[xPos, yPos, zPos]} receiveShadow castShadow>
            <boxGeometry args={[wallThickness, wallHeight, length]} />
            <meshStandardMaterial color={wallColor} />
        </mesh>
        <mesh position={[-xPos, yPos, zPos]} receiveShadow castShadow>
            <boxGeometry args={[wallThickness, wallHeight, length]} />
            <meshStandardMaterial color={wallColor} />
        </mesh>

        {/* Ceiling */}
        <mesh position={[0, wallHeight, zPos]} receiveShadow castShadow>
            <boxGeometry args={[width, wallThickness, length]} />
            <meshStandardMaterial color={wallColor} />
        </mesh>

        {/* Front wall with doorway (entrance from previous room) */}
        {prevRoom ? (
            <>
                {/* Left/Right wall sections */}
                {wallSectionWidth > 0 && (
                    <>
                        <mesh position={[-doorwayWidth / 2 - wallSectionWidth / 2, yPos, 0]} receiveShadow castShadow>
                            <boxGeometry args={[wallSectionWidth, wallHeight, wallThickness]} />
                            <meshStandardMaterial color={wallColor} />
                        </mesh>
                        <mesh position={[doorwayWidth / 2 + wallSectionWidth / 2, yPos, 0]} receiveShadow castShadow>
                            <boxGeometry args={[wallSectionWidth, wallHeight, wallThickness]} />
                            <meshStandardMaterial color={wallColor} />
                        </mesh>
                    </>
                )}
                {/* Top wall section */}
                {topWallHeight > 0 && (
                    <mesh position={[0, doorwayHeight + topWallHeight / 2, 0]} receiveShadow castShadow>
                        <boxGeometry args={[doorwayWidth, topWallHeight, wallThickness]} />
                        <meshStandardMaterial color={wallColor} />
                    </mesh>
                )}
            </>
        ) : (
            /* First room - solid front wall */
            <mesh position={[0, yPos, 0]} receiveShadow castShadow>
                <boxGeometry args={[width, wallHeight, wallThickness]} />
                <meshStandardMaterial color={wallColor} />
            </mesh>
        )}

        {/* Back wall with doorway (exit to next room) */}
        <>
            {/* Left/Right wall sections */}
            {wallSectionWidth > 0 && (
                <>
                    <mesh position={[-doorwayWidth / 2 - wallSectionWidth / 2, yPos, length]} receiveShadow castShadow>
                        <boxGeometry args={[wallSectionWidth, wallHeight, wallThickness]} />
                        <meshStandardMaterial color={wallColor} />
                    </mesh>
                    <mesh position={[doorwayWidth / 2 + wallSectionWidth / 2, yPos, length]} receiveShadow castShadow>
                        <boxGeometry args={[wallSectionWidth, wallHeight, wallThickness]} />
                        <meshStandardMaterial color={wallColor} />
                    </mesh>
                </>
            )}
            {/* Top wall section */}
            {topWallHeight > 0 && (
                <mesh position={[0, doorwayHeight + topWallHeight / 2, length]} receiveShadow castShadow>
                    <boxGeometry args={[doorwayWidth, topWallHeight, wallThickness]} />
                    <meshStandardMaterial color={wallColor} />
                </mesh>
            )}
        </>
    </group>;
}

