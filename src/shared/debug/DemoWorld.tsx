import type { ThreeElements } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { BackSide } from "three"
import { Csm } from "../Csm"

const DemoWorld = (props: ThreeElements['group']) => {
    return <>
        <group {...props}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#7a7a7a" />
            </mesh>
            <gridHelper args={[100, 100]} position={[0, 0.01, 0]} />
        </group >
        <DemoEnvironment />

    </>
}

export const DemoEnvironment = () => {
    return <>
        <Environment>
            <mesh>
                <sphereGeometry args={[50, 32, 32]} />
                <meshBasicMaterial side={BackSide} color={"#87ceeb"} />
            </mesh>
        </Environment>
        <Csm />

        <ambientLight intensity={0.5} />
        <fog attach="fog" args={['#87ceeb', 35, 100]} />
        <color attach="background" args={["#87ceeb"]} />

    </>
}

export default DemoWorld