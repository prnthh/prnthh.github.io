import { Entity } from "@/shared/providers/GameStore";

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

export default VisualSection;