import { useThree } from "@react-three/fiber"
import { useEffect } from "react"
import * as THREE from "three";

export default function Sun() {
    const { scene, camera, gl } = useThree()
    useEffect(() => {
        const sun = new THREE.DirectionalLight(0xffe499, 2)
        sun.castShadow = true
        sun.shadow.camera.left = -2
        sun.shadow.camera.right = 2
        sun.shadow.camera.top = 2
        sun.shadow.camera.bottom = -2
        sun.shadow.mapSize.set(2048, 2048)
        sun.shadow.bias = -0.001
        sun.position.set(0.5, 3, 0.5)

        const hemi1 = new THREE.HemisphereLight(0x333366, 0x74ccf4, 3)
        const hemi2 = new THREE.HemisphereLight(0x74ccf4, 0, 1)

        scene.add(sun, hemi1, hemi2)
    }, [scene])

    return null;
}