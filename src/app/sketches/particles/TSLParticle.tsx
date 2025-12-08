"use client";

import { useEffect } from "react";
import { AdditiveBlending, PlaneGeometry, SpriteNodeMaterial, Vector3 } from "three/webgpu";
import { range, texture, mix, uv, color, rotateUV, positionLocal, time, uniform } from 'three/tsl';
import { useTexture } from "@react-three/drei";
import { useControls } from "leva";


export default function Particles({ particle = '/textures/smoke.png' }: { particle?: string }) {
    const { speed } = useControls({ speed: { value: 0.2, min: 0, max: 1, step: 0.01 } });

    const map = useTexture(particle);

    // create nodes
    const lifeRange = range(0.1, 1);
    const offsetRange = range(new Vector3(-2, 3, -2), new Vector3(2, 5, 2));

    const speedUniform = uniform(speed);
    const scaledTime = time.add(5).mul(speedUniform);

    useEffect(() => {
        speedUniform.value = speed;
    }, [speed]);

    const lifeTime = scaledTime.mul(lifeRange).mod(1);
    const scaleRange = range(0.3, 2);
    const rotateRange = range(0.1, 4);

    const life = lifeTime.div(lifeRange);

    const fakeLightEffect = positionLocal.y.oneMinus().max(0.2);

    const textureNode = texture(map, rotateUV(uv(), scaledTime.mul(rotateRange)));

    const opacityNode = textureNode.a.mul(life.oneMinus());

    const smokeColor = mix(color(0x2c1501), color(0x222222), positionLocal.y.mul(3).clamp());

    // create materials
    const smokeNodeMaterial = new SpriteNodeMaterial();
    smokeNodeMaterial.colorNode = mix(color(0xf27d0c), smokeColor, life.mul(2.5).min(1)).mul(fakeLightEffect);
    smokeNodeMaterial.opacityNode = opacityNode;
    smokeNodeMaterial.positionNode = offsetRange.mul(lifeTime);
    smokeNodeMaterial.scaleNode = scaleRange.mul(lifeTime.max(0.3));
    smokeNodeMaterial.depthWrite = false;

    const fireNodeMaterial = new SpriteNodeMaterial();
    fireNodeMaterial.colorNode = mix(color(0xb72f17), color(0xb72f17), life);
    fireNodeMaterial.positionNode = range(new Vector3(-1, 1, -1), new Vector3(1, 2, 1)).mul(lifeTime);
    fireNodeMaterial.scaleNode = smokeNodeMaterial.scaleNode;
    fireNodeMaterial.opacityNode = opacityNode.mul(0.5);
    fireNodeMaterial.blending = AdditiveBlending;
    fireNodeMaterial.transparent = true;
    fireNodeMaterial.depthWrite = false;

    const planeGeometry = new PlaneGeometry(1, 1);

    return (
        <>
            <group position={[2, 2, 0]}>
                <instancedMesh args={[planeGeometry, smokeNodeMaterial, 200]} scale={1} />
                <instancedMesh args={[planeGeometry, fireNodeMaterial, 100]} scale={1} position={[0, -1, 0]} renderOrder={1} />
            </group>
        </>
    );
}
