import Window from "./windowTSL";


const Building = ({
    position = [0, 0, 0],
    size = [3, 2.2, 3],
}: {
    position?: [number, number, number],
    size?: [number, number, number],
}) => {
    const width = size[0];
    const height = size[1];
    const depth = size[2];

    return (
        <mesh position={[position[0], position[1] + height / 2, position[2]]}>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color="grey" />

            {/* Front face */}
            <Window wallTexture="/textures/cubemap-faces.png" position={[0, 0, depth / 2 + 0.01]} rotation={[0, 0, 0]} />

            {/* Back face */}
            <Window position={[0, 0, -(depth / 2 + 0.01)]} rotation={[0, Math.PI, 0]} />

            {/* Left face */}
            <Window position={[-(width / 2 + 0.01), 0, 0]} rotation={[0, -Math.PI / 2, 0]} />

            {/* Right face */}
            <Window position={[width / 2 + 0.01, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        </mesh>
    );
}

export default Building