import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { color, normalWorld } from 'three/tsl'

export default function FogBG() {
    const { scene, camera, gl } = useThree()
    useEffect(() => {
        scene.fog = new THREE.Fog(0x0487e2, 7, 25)
        scene.backgroundNode = normalWorld.y.mix(color(0x0487e2), color(0x0066ff))
    }, [scene])
    return null;
}