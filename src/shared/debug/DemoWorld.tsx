import { RigidBody } from "@react-three/rapier"
import { ThreeElements, ThreeEvent } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import DebugGround from "@/shared/ground/DebugGround"
import { BackSide } from "three"

const DemoWorld = ({ onClick, ...props }: ThreeElements['group']) => {
    return <>
        <group {...props}>
            <RigidBody>
                <mesh castShadow position={[0, 0, -3]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="#c18d40" />
                </mesh>
            </RigidBody>

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

        <pointLight position={[10, 10, 10]} castShadow intensity={1000} />
        <ambientLight intensity={0.5} />
        <fog attach="fog" args={['#87ceeb', 35, 50]} />
        <color attach="background" args={["#87ceeb"]} />

    </>
}

export default DemoWorld