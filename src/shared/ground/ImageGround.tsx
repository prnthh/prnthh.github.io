import { useTexture } from "@react-three/drei";
import * as THREE from 'three';
import { useEffect } from 'react';



export const ImageMaterial = ({ image = "/textures/road.jpg", repeat }: { image?: string, repeat?: [number, number] }) => {
    const textures = useTexture({
        map: image,
    });

    useEffect(() => {
        if (textures.map) {
            textures.map.wrapS = textures.map.wrapT = THREE.RepeatWrapping;

            // Set repeat to a much higher value to avoid stretching
            const repeatValues = repeat || [10, 10];
            textures.map.repeat.set(repeatValues[0], repeatValues[1]); // Increase tiling frequency

            // Improve texture quality when viewed at an angle
            textures.map.anisotropy = 16;

            // Optional: Adjust texture filtering for better appearance
            textures.map.minFilter = THREE.LinearMipmapLinearFilter;
            textures.map.magFilter = THREE.LinearFilter;

            // Update texture to apply changes
            textures.map.needsUpdate = true;
        }
    }, [textures.map, repeat]);

    return <meshStandardMaterial {...textures} />
}


export default ImageMaterial;