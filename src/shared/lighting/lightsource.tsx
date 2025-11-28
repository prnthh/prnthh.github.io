import { useGLTF } from "@react-three/drei";
import { RapierRigidBody, RigidBody } from "@react-three/rapier"
import { useEffect, useRef, useState } from "react";
import { SkeletonUtils } from "three-stdlib";
import { Object3D, SpotLight, Vector3 } from "three/webgpu";

const Lightsource = ({ model, position = [0, 0, 0], rotation }: { model: string, position?: [number, number, number], rotation?: [number, number, number] }) => {
    // const person = useSelector((state: RootState) => selectPersonById(state, id));

    const { scene, animations } = useGLTF(model);
    const [clonedScene, setClonedScene] = useState<Object3D | undefined>(undefined);
    const rigidBodyRef = useRef<RapierRigidBody>(null);

    useEffect(() => {
        if (scene) {
            const cloned = SkeletonUtils.clone(scene);
            cloned.traverse((child: Object3D) => {
                if ('isMesh' in child) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }

                // Fix spotlight rotation issue
                if (child.type === 'SpotLight') {
                    const spotlight = child as SpotLight;

                    spotlight.castShadow = true;
                    if (spotlight.target) {
                        const targetPosition = new Vector3();
                        spotlight.getWorldPosition(targetPosition);
                        targetPosition.y -= 10;

                        spotlight.target.position.copy(targetPosition);
                        if (!cloned.children.includes(spotlight.target)) {
                            cloned.add(spotlight.target);
                        }
                    }

                    // Update the spotlight matrix
                    spotlight.updateMatrixWorld(true);
                }
            });
            setClonedScene(cloned);
        }
    }, [scene]);


    if (!clonedScene) return null;

    return (
        <RigidBody
            ref={rigidBodyRef}
            type="fixed"
            position={position}
            rotation={rotation}
        >
            <primitive object={clonedScene} scale={1} />
        </RigidBody >
    );
}

export default Lightsource