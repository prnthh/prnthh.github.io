import { Preload, useGLTF } from "@react-three/drei";
import { ThreeElement } from "@react-three/fiber";

export default function SimpleModel({ model, children, ...props }:
    { model: string, children?: React.ReactNode } & ThreeElement<any>) {
    const { scene } = useGLTF(model);
    return <primitive object={scene} {...props}>
        {children}
        <Preload all />
    </primitive>
}