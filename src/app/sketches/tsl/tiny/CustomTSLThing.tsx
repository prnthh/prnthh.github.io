import { useMemo } from 'react';
import {
    mix, modelWorldMatrix,
    positionLocal,
    sin,
    timerLocal,
    uniform,
    uv,
    vec3,
    vec4,
} from 'three/tsl';

import {
    MeshBasicNodeMaterial,
} from 'three/webgpu';

export function CustomTSLThing() {
    const uniforms = useMemo(
        () => ({
            frequencyX: uniform(10),
            frequencyY: uniform(5),
        }),
        []
    );

    const customMaterial = useMemo(() => {
        const material = new MeshBasicNodeMaterial();
        const time = timerLocal(1);

        // vertex
        const modelPosition = modelWorldMatrix.mul(vec4(positionLocal, 1));
        const elevation = sin(modelPosition.x.mul(uniforms.frequencyX).sub(time))
            .mul(0.1)
            .add(sin(modelPosition.z.mul(uniforms.frequencyY).sub(time)).mul(0.1));
        material.positionNode = positionLocal.add(vec3(0, 0, elevation));

        // fragment
        const color1 = vec3(uv(), 1.0);
        const color2 = vec3(1.0, uv());
        material.colorNode = mix(color1, color2, sin(time).mul(0.5).add(0.5));

        return material;
    }, [uniforms]);

    // useControls({
    //     frequency: {
    //         value: [10, 5],
    //         onChange: (value) => {
    //             uniforms.frequencyX.value = value[0];
    //             uniforms.frequencyY.value = value[1];
    //         },
    //     },
    // });

    return (
        <>
            <mesh material={customMaterial} rotation-x={-Math.PI * 0.5}>
                <planeGeometry args={[1, 1, 512, 512]} />
            </mesh>
        </>
    );
}