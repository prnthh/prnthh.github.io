import { RigidBody } from "@react-three/rapier"
import { ThreeElements, ThreeEvent } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import DebugGround from "@/shared/ground/DebugGround"
import { BackSide } from "three"
import { Csm } from "../Csm"

const DemoWorld = ({ onClick, ...props }: ThreeElements['group']) => {
    return <>
        <group {...props}>
            <DebugGround onClick={onClick as any} />
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