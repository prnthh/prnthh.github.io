import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import { extend, ThreeEvent, useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { BoxGeometry, MeshNormalMaterial } from 'three';

// add InstancedMesh2 to the jsx catalog i.e use it as a jsx component
extend({ InstancedMesh2 });

const InstanceMeshTest = () => {
    const ref = useRef<InstancedMesh2>(null);

    const geometry = useMemo(() => new BoxGeometry(), []);

    const material = useMemo(() => new MeshNormalMaterial(), []);

    useFrame(() => {
        // early return
        if (!ref.current || ref.current.instancesCount >= 200000) return;

        // add 100 instances every frame
        ref.current.addInstances(100, (obj) => {
            obj.position
                .setX(Math.random() * 10000 - 5000)
                .setY(Math.random() * 10000 - 5000)
                .setZ(Math.random() * 10000 - 5000);
            obj.scale.random().multiplyScalar(Math.random() * 10 + 5);
            obj.quaternion.random();
        });
    });

    useEffect(() => {
        if (!ref.current) return;

        // only compute the bvh on mount
        ref.current.computeBVH();
    }, []);

    const handleOnClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        if (!ref.current) return;
        const { instanceId } = e;

        if (!instanceId) return;
        ref.current.setVisibilityAt(instanceId, false);
    }, []);

    return (
        // @ts-expect-error InstancedMesh2 is not a valid JSX element
        <instancedMesh2
            ref={ref}
            args={[geometry, material]}
            onClick={handleOnClick}
        />
    );
};

export default InstanceMeshTest;
