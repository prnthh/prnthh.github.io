"use client"

import React, { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three/webgpu'
import { useTexture } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import { WaterMesh } from 'three/addons/objects/WaterMesh.js'

export function WaterMaterial() {
    const waterNormals = useTexture('/textures/waternormals.jpg');

    const waterMaterial = useMemo(() => {
        waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
        waterNormals.repeat.set(1, 1);

        // Create a simple TSL-compatible water material instead of using the Water object
        const material = new THREE.MeshStandardMaterial({
            color: 0x001e4f,
            normalMap: waterNormals,
            transparent: true,
            opacity: 0.8,
            roughness: 0.1,
            metalness: 0.1
        });

        return material;
    }, [waterNormals]);

    return <primitive object={waterMaterial} attach="material" />;
}

export default function Ocean() {
    const groupRef = useRef<THREE.Group>(null);
    const waterRef = useRef<WaterMesh>(null);
    const { scene } = useThree();
    const waterNormals = useTexture('/textures/waternormals.jpg');

    // Configure texture wrapping - same as official example
    useMemo(() => {
        waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
        // Make texture less high-res by reducing repeat
        waterNormals.repeat.set(1, 1);
    }, [waterNormals]);

    // Create water mesh imperatively like the official example
    useEffect(() => {
        if (!groupRef.current) return;

        const waterGeometry = new THREE.PlaneGeometry(1024, 1024);
        const water = new WaterMesh(waterGeometry, {
            waterNormals: waterNormals,
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x001e4f, // More blue color
            distortionScale: 1.0,    // Reduced for less high-res effect
            size: 100
        });

        water.rotation.x = -Math.PI / 2;

        waterRef.current = water;
        groupRef.current.add(water);

        return () => {
            if (groupRef.current && water) {
                groupRef.current.remove(water);
            }
        };
    }, [waterNormals]);

    return null;
    return <group ref={groupRef} position={[256, 1, 256]} />;
}

