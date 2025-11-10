export default function Gun() {
    return <mesh rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.1, 1]} />
        <meshStandardMaterial color="black" />
    </mesh>
}