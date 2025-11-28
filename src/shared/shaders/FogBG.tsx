import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { Fog } from "three";
import { color, normalWorld } from 'three/tsl'

export default function FogBG() {
    const { scene, } = useThree()
    useEffect(() => {
        scene.fog = new Fog(0x0487e2, 7, 25)
        scene.backgroundNode = normalWorld.y.mix(color(0x0487e2), color(0x0066ff))
    }, [scene])
    return null;
}