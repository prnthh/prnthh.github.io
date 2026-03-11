"use client";

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import {
    Fn,
    texture,
    uv,
    uint,
    instancedArray,
    positionWorld,
    billboarding,
    time,
    hash,
    deltaTime,
    vec2,
    instanceIndex,
    positionGeometry,
    If,
    float as tslFloat
} from 'three/tsl';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

interface RainProps {
    /** Maximum number of particles */
    maxParticleCount?: number;
    /** Initial particle count */
    particleCount?: number;
    /** Rain area size [width, depth] */
    areaSize?: [number, number];
    /** Rain area center position */
    position?: [number, number, number];
    /** Enable collision detection */
    enableCollision?: boolean;
    /** Rain drop opacity */
    opacity?: number;
    /** Rain drop size */
    dropSize?: [number, number];
    /** Rain speed multiplier */
    speedMultiplier?: number;
}

export default function Rain({
    maxParticleCount = 50000,
    particleCount = 25000,
    areaSize = [100, 100],
    position = [0, 25, 0],
    enableCollision = true,
    opacity = 0.15,
    dropSize = [0.08, 2.5],
    speedMultiplier = 1
}: RainProps) {
    const { scene, gl: renderer } = useThree();
    const rainGroupRef = useRef<THREE.Group>(null);
    const collisionCameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const collisionPosRTRef = useRef<THREE.RenderTarget | null>(null);
    const collisionPosMaterialRef = useRef<THREE.MeshBasicNodeMaterial | null>(null);
    const computeParticlesRef = useRef<any>(null);
    const rainParticlesRef = useRef<THREE.Mesh | null>(null);
    const rippleParticlesRef = useRef<THREE.Mesh | null>(null);

    const [halfWidth, halfDepth] = [areaSize[0] / 2, areaSize[1] / 2];

    // Initialize collision detection
    useEffect(() => {
        if (!enableCollision) return;

        const collisionCamera = new THREE.OrthographicCamera(
            -halfWidth, halfWidth, halfDepth, -halfDepth, 0.1, 50
        );
        collisionCamera.position.set(position[0], position[1] + 25, position[2]); // Position relative to rain area
        collisionCamera.lookAt(position[0], 0, position[2]); // Look at ground level
        collisionCamera.layers.disableAll();
        collisionCamera.layers.enable(1);
        collisionCameraRef.current = collisionCamera;

        const collisionPosRT = new THREE.RenderTarget(1024, 1024);
        collisionPosRT.texture.type = THREE.HalfFloatType;
        collisionPosRT.texture.magFilter = THREE.NearestFilter;
        collisionPosRT.texture.minFilter = THREE.NearestFilter;
        collisionPosRT.texture.generateMipmaps = false;
        collisionPosRTRef.current = collisionPosRT;

        const collisionPosMaterial = new THREE.MeshBasicNodeMaterial();
        collisionPosMaterial.colorNode = positionWorld;
        collisionPosMaterialRef.current = collisionPosMaterial;

        return () => {
            collisionPosRT.dispose();
            collisionPosMaterial.dispose();
        };
    }, [enableCollision, halfWidth, halfDepth, position]);

    // Initialize compute shader and particles
    const particles = useMemo(() => {
        const positionBuffer = instancedArray(maxParticleCount, 'vec3');
        const velocityBuffer = instancedArray(maxParticleCount, 'vec3');
        const ripplePositionBuffer = instancedArray(maxParticleCount, 'vec3');
        const rippleTimeBuffer = instancedArray(maxParticleCount, 'vec3');

        // Compute initialization
        const randUint = () => uint(Math.random() * 0xFFFFFF);

        const computeInit = Fn(() => {
            const position = positionBuffer.element(instanceIndex);
            const velocity = velocityBuffer.element(instanceIndex);
            const rippleTime = rippleTimeBuffer.element(instanceIndex);

            const randX = hash(instanceIndex);
            const randY = hash(instanceIndex.add(randUint()));
            const randZ = hash(instanceIndex.add(randUint()));

            position.x = randX.mul(areaSize[0]).add(-halfWidth);
            position.y = randY.mul(50); // Spawn higher
            position.z = randZ.mul(areaSize[1]).add(-halfDepth);

            velocity.y = randX.mul(-0.04 * speedMultiplier).add(-0.2 * speedMultiplier);

            rippleTime.x.assign(tslFloat(1000));
        })().compute(maxParticleCount);

        // Compute update
        const computeUpdate = Fn(() => {
            const getCoord = (pos: any) => pos.add(halfWidth).div(areaSize[0]);

            const position = positionBuffer.element(instanceIndex);
            const velocity = velocityBuffer.element(instanceIndex);
            const ripplePosition = ripplePositionBuffer.element(instanceIndex);
            const rippleTime = rippleTimeBuffer.element(instanceIndex);

            position.addAssign(velocity);
            rippleTime.x = rippleTime.x.add(deltaTime.mul(4));

            if (enableCollision && collisionPosRTRef.current) {
                const collisionArea = texture(collisionPosRTRef.current.texture, getCoord(position.xz));
                const surfaceOffset = 0.05;
                const floorPosition = collisionArea.y.add(surfaceOffset);
                const ripplePivotOffsetY = -0.9;

                If(position.y.add(ripplePivotOffsetY).lessThan(floorPosition), () => {
                    position.y.assign(tslFloat(25));

                    ripplePosition.xz.assign(position.xz);
                    // Convert world Y to local space relative to rain group position
                    ripplePosition.y.assign(floorPosition.sub(tslFloat(position[1])));

                    rippleTime.x.assign(tslFloat(1));

                    position.x.assign(hash(instanceIndex.add(time)).mul(areaSize[0]).add(-halfWidth));
                    position.z.assign(hash(instanceIndex.add(time.add(randUint()))).mul(areaSize[1]).add(-halfDepth));
                });

                const rippleOnSurface = texture(collisionPosRTRef.current.texture, getCoord(ripplePosition.xz));
                const rippleFloorArea = rippleOnSurface.y.add(surfaceOffset);

                If(ripplePosition.y.greaterThan(rippleFloorArea), () => {
                    rippleTime.x.assign(tslFloat(1000));
                });
            } else {
                // Simple reset without collision
                If(position.y.lessThan(-1), () => {
                    position.y.assign(tslFloat(25));
                    position.x.assign(hash(instanceIndex.add(time)).mul(areaSize[0]).add(-halfWidth));
                    position.z.assign(hash(instanceIndex.add(time.add(randUint()))).mul(areaSize[1]).add(-halfDepth));

                    ripplePosition.xz.assign(position.xz);
                    ripplePosition.y.assign(tslFloat(0));
                    rippleTime.x.assign(tslFloat(1));
                });
            }
        });

        const computeParticles = computeUpdate().compute(maxParticleCount);
        computeParticlesRef.current = computeParticles;

        // Rain material
        const rainMaterial = new THREE.MeshBasicNodeMaterial();
        rainMaterial.colorNode = uv().distance(vec2(0.5, 0)).oneMinus().exp().mul(0.25);
        rainMaterial.vertexNode = billboarding({ position: positionBuffer.toAttribute() });
        rainMaterial.opacity = opacity;
        rainMaterial.side = THREE.DoubleSide;
        rainMaterial.forceSinglePass = true;
        rainMaterial.depthWrite = false;
        rainMaterial.depthTest = true;
        rainMaterial.transparent = true;

        const rainGeometry = new THREE.PlaneGeometry(dropSize[0], dropSize[1]);
        const rainParticles = new THREE.Mesh(rainGeometry, rainMaterial);
        rainParticles.count = particleCount;
        rainParticles.frustumCulled = false;

        // Ripple material
        const rippleTime = rippleTimeBuffer.element(instanceIndex).x;

        const rippleEffect = Fn(() => {
            const center = uv().add(vec2(-0.5)).length().mul(7);
            const distance = rippleTime.sub(center);
            return distance.min(1).sub(distance.max(1).sub(1));
        });

        const rippleMaterial = new THREE.MeshBasicNodeMaterial();
        rippleMaterial.colorNode = rippleEffect();
        rippleMaterial.positionNode = positionGeometry.add(ripplePositionBuffer.toAttribute());
        rippleMaterial.opacityNode = rippleTime.mul(0.3).oneMinus().max(0).mul(0.1);
        rippleMaterial.side = THREE.DoubleSide;
        rippleMaterial.forceSinglePass = true;
        rippleMaterial.depthWrite = false;
        rippleMaterial.depthTest = true;
        rippleMaterial.transparent = true;

        // Ripple geometry
        const surfaceRippleGeometry = new THREE.PlaneGeometry(0.8, 0.8);
        surfaceRippleGeometry.rotateX(-Math.PI / 2);

        const xRippleGeometry = new THREE.PlaneGeometry(0.3, 0.6);
        xRippleGeometry.rotateY(-Math.PI / 2);

        const zRippleGeometry = new THREE.PlaneGeometry(0.3, 0.6);

        const rippleGeometry = BufferGeometryUtils.mergeGeometries([
            surfaceRippleGeometry,
            xRippleGeometry,
            zRippleGeometry
        ]);

        const rippleParticles = new THREE.Mesh(rippleGeometry, rippleMaterial);
        rippleParticles.count = particleCount;
        rippleParticles.frustumCulled = false;

        return { computeInit, rainParticles, rippleParticles };
    }, [maxParticleCount, particleCount, areaSize, halfWidth, halfDepth, enableCollision, opacity, dropSize, speedMultiplier]);

    // Initialize compute shader
    useEffect(() => {
        if (particles && renderer && 'compute' in renderer) {
            (renderer as any).compute(particles.computeInit);
        }
    }, [particles, renderer]);

    // Animation loop
    useFrame(() => {
        if (!renderer || !('compute' in renderer) || !computeParticlesRef.current) return;

        const webgpuRenderer = renderer as any;

        // Render collision map if enabled
        if (enableCollision && collisionCameraRef.current && collisionPosRTRef.current && collisionPosMaterialRef.current) {
            const originalOverride = scene.overrideMaterial;
            scene.overrideMaterial = collisionPosMaterialRef.current;
            webgpuRenderer.setRenderTarget(collisionPosRTRef.current);
            webgpuRenderer.render(scene, collisionCameraRef.current);
            scene.overrideMaterial = originalOverride;
            webgpuRenderer.setRenderTarget(null);
        }

        // Compute particles
        webgpuRenderer.compute(computeParticlesRef.current);
    });

    if (!particles) return null;

    return (
        <group ref={rainGroupRef} position={position}>
            <primitive object={particles.rainParticles} ref={rainParticlesRef} />
            <primitive object={particles.rippleParticles} ref={rippleParticlesRef} />
        </group>
    );
}
