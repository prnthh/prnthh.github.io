import DebugGround from "@/shared/debug/DebugGround"
import { RigidBody } from "@react-three/rapier"
import { ThreeElements } from "@react-three/fiber"

const DemoWorld = ({ ...props }: ThreeElements['group']) => {
    return <>
        <group {...props}>
            <RigidBody>
                <mesh castShadow position={[0, 0, -10]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="orange" />
                </mesh>
            </RigidBody>

            <DebugGround />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} castShadow intensity={1000} />
        </group >
    </>

}

export default DemoWorld