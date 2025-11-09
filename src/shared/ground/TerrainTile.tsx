import DetailedMaterial from "@/shared/shaders/floor/DetailedMaterial";
import { Plane } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";

const TerrainTile = ({
    position = [-16, 0, 0],
    map,
    displacementMap,
    normalMap,
    roughnessMap,
}: {
    position?: [number, number, number];
    map?: string;
    displacementMap?: string;
    normalMap?: string;
    roughnessMap?: string;
}) => {
    return <RigidBody type="fixed" colliders="cuboid">
        <Plane
            rotation={[-Math.PI / 2, 0, 0]}
            position={position}
            args={[32, 32, 256, 256]}
            receiveShadow
            castShadow
        >
            <DetailedMaterial
                map={map}
                displacementMap={displacementMap}
                normalMap={normalMap}
                roughnessMap={roughnessMap}
            />
        </Plane>
    </RigidBody>
};

export default TerrainTile;