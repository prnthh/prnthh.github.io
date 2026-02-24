import { extend, useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { color, deltaTime, float, Fn, hash, If, instancedArray, instanceIndex, range, uniform, vec3 } from "three/tsl";
import { AdditiveBlending, SpriteNodeMaterial } from "three/webgpu";
extend({ SpriteNodeMaterial });

export const GPGPUParticles = ({ nbParticles = 1000 }) => {
    const gl = useThree((state) => state.gl);


    const { nodes, uniforms, computeUpdate } = useMemo(() => {
        // uniforms
        const uniforms = {
            color: uniform(color("white")),
        };

        // buffers
        const spawnPositionsBuffer = instancedArray(nbParticles, "vec3");
        const offsetPositionsBuffer = instancedArray(nbParticles, "vec3");
        const agesBuffer = instancedArray(nbParticles, "float");

        const spawnPosition = spawnPositionsBuffer.element(instanceIndex);
        const offsetPosition = offsetPositionsBuffer.element(instanceIndex);
        const age = agesBuffer.element(instanceIndex);

        const lifetime = hash(instanceIndex.add(13)).mul(6 - 0.1).add(0.1);

        const computeInit = Fn(() => {
            spawnPosition.assign(
                vec3(
                    hash(instanceIndex.add(0)).mul(6).add(-3),
                    hash(instanceIndex.add(1)).mul(6).add(-3),
                    hash(instanceIndex.add(2)).mul(6).add(-3)
                )
            );
            offsetPosition.assign(0);
            age.assign(hash(instanceIndex.add(11)).mul(lifetime));
        })().compute(nbParticles);

        (gl as any).compute(computeInit);


        const instanceSpeed = hash(instanceIndex.add(12)).mul(0.05 - 0.01).add(0.01);

        // update Fn
        const computeUpdate = Fn(() => {
            age.addAssign(deltaTime);

            If(age.greaterThan(lifetime), () => {
                age.assign(0);
                offsetPosition.assign(0);
            });

            offsetPosition.addAssign(vec3(instanceSpeed));
        })().compute(nbParticles);

        const scale = vec3(range(0.001, 0.01));

        return {
            uniforms,
            computeUpdate,
            nodes: {
                positionNode: spawnPosition.add(offsetPosition),
                colorNode: uniforms.color,
                scaleNode: scale,
            },
        };
    }, []);

    useFrame(() => {
        (gl as any).compute(computeUpdate);
    });

    return (
        <>
            <sprite count={nbParticles}>
                <spriteNodeMaterial
                    {...nodes}
                    transparent
                    depthWrite={false}
                    blending={AdditiveBlending}
                />
            </sprite>
        </>
    );
};

