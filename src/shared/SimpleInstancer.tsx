import DebugCamera from "@/shared/cameras/DebugCamera";
import GameCanvas from "@/shared/GameCanvas";
import { useEffect, useRef } from "react";
import { Group } from "three";
import * as THREE from "three";

function Instancer({ poolSize = 10, temp = new THREE.Object3D() }) {
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null!)
    useEffect(() => {
        if (!instancedMeshRef.current) return
        // Set positions
        for (let i = 0; i < poolSize; i++) {
            temp.position.set(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50)
            temp.updateMatrix()
            instancedMeshRef.current.setMatrixAt(i, temp.matrix)
        }
        // Update the instance
        instancedMeshRef.current.instanceMatrix.needsUpdate = true
    }, [poolSize, temp])
    return (
        <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, poolSize]}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshPhongMaterial color="hotpink" />
        </instancedMesh>
    )
}

export default Instancer;