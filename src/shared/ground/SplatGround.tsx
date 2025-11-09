import { TextureSplatMaterial } from "@/shared/shaders/TextureSplatMaterial"

const SplatGround = ({
    position = [0, 0, 0] as [number, number, number],
    width = 32,
    height = 32,
    widthSegments = 128,
    heightSegments = 128
}) => {
    return <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
        <TextureSplatMaterial />
        <planeGeometry args={[width, height, widthSegments, heightSegments]} />
    </mesh>
}

export default SplatGround;