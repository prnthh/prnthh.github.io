import { HeightfieldCollider, RigidBody } from "@react-three/rapier";
import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { ImprovedNoise } from "three/examples/jsm/Addons.js";
import { useThree } from "@react-three/fiber";

export function Terrain({ onClick }: { onClick?: (coords: number[]) => void }) {
    // Match the demo's dimensions
    const worldWidth = 256;
    const worldDepth = 256;
    const worldHalfWidth = worldWidth / 2;
    const worldHalfDepth = worldDepth / 2;

    // References for raycasting
    const terrainRef = useRef<THREE.Mesh>(null);
    const helperRef = useRef<THREE.Mesh>(null);
    const raycaster = useMemo(() => new THREE.Raycaster(), []);
    const pointer = useMemo(() => new THREE.Vector2(), []);
    const [pointerOnTerrain, setPointerOnTerrain] = useState(false);
    const { camera, gl, scene } = useThree();

    // Set background color and camera far plane to match the demo
    useEffect(() => {
        if (scene) {
            scene.background = new THREE.Color(0xbfd1e5);
        }

        // Extend the camera's far plane to see the entire terrain
        if (camera) {
            camera.far = 100000;
            camera.updateProjectionMatrix();
        }
    }, [scene, camera]);

    // Generate height data using Perlin noise - updated to match the demo
    const generateHeight = (width: number, height: number) => {
        const size = width * height;
        const data = new Uint8Array(size);
        const perlin = new ImprovedNoise();
        const z = Math.random() * 100;

        let quality = 1;

        for (let j = 0; j < 4; j++) {
            for (let i = 0; i < size; i++) {
                const x = i % width;
                const y = ~~(i / width); // ~~ is a faster Math.floor
                data[i] += Math.abs(perlin.noise(x / quality, y / quality, z) * quality * 1.75);
            }
            quality *= 5;
        }

        return data;
    };

    // Generate a texture based on height data - updated to match the demo
    const generateTexture = (data: Uint8Array, width: number, height: number) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) return null;

        // Fill with black initially
        context.fillStyle = '#000';
        context.fillRect(0, 0, width, height);

        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const imageData = image.data;

        const sun = new THREE.Vector3(1, 1, 1);
        sun.normalize();

        // Using Vector3 for normal calculation
        const vector3 = new THREE.Vector3(0, 0, 0);

        for (let i = 0, j = 0, l = imageData.length; i < l; i += 4, j++) {
            vector3.x = data[j - 2] - data[j + 2];
            vector3.y = 2;
            vector3.z = data[j - width * 2] - data[j + width * 2];
            vector3.normalize();

            const shade = vector3.dot(sun);

            // Match the exact color calculations from the demo
            imageData[i] = (96 + shade * 128) * (0.5 + data[j] * 0.007);
            imageData[i + 1] = (32 + shade * 96) * (0.5 + data[j] * 0.007);
            imageData[i + 2] = (shade * 96) * (0.5 + data[j] * 0.007);
            imageData[i + 3] = 255;
        }

        context.putImageData(image, 0, 0);

        // Create scaled 4x version
        const canvasScaled = document.createElement('canvas');
        canvasScaled.width = width * 4;
        canvasScaled.height = height * 4;

        const scaledContext = canvasScaled.getContext('2d');
        if (scaledContext) {
            scaledContext.scale(4, 4);
            scaledContext.drawImage(canvas, 0, 0);

            const scaledImage = scaledContext.getImageData(0, 0, canvasScaled.width, canvasScaled.height);
            const scaledData = scaledImage.data;

            // Add random variations for more natural look
            for (let i = 0, l = scaledData.length; i < l; i += 4) {
                const v = ~~(Math.random() * 5);
                scaledData[i] += v;
                scaledData[i + 1] += v;
                scaledData[i + 2] += v;
            }

            scaledContext.putImageData(scaledImage, 0, 0);

            const texture = new THREE.CanvasTexture(canvasScaled);
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.colorSpace = THREE.SRGBColorSpace;

            return texture;
        }

        // Fallback to original texture if scaling fails
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;

        return texture;
    };

    const heightData = useMemo(() => {
        return generateHeight(worldWidth, worldDepth);
    }, []);

    const heightField = useMemo(() => {
        return Array.from(heightData);
    }, [heightData]);

    const terrainTexture = useMemo(() => {
        return generateTexture(heightData, worldWidth, worldDepth);
    }, [heightData]);

    const geometry = useMemo(() => {
        // Create terrain geometry with dimensions matching the demo
        const geometry = new THREE.PlaneGeometry(7500, 7500, worldWidth - 1, worldDepth - 1);
        geometry.rotateX(-Math.PI / 2);

        const vertices = geometry.attributes.position.array;
        for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
            vertices[j + 1] = heightData[i] * 10; // Elevate Y position based on height data
        }

        geometry.computeVertexNormals();
        return geometry;
    }, [heightData]);

    // Handle pointer movement for raycasting
    useEffect(() => {
        const handlePointerMove = (event: MouseEvent) => {
            // Calculate pointer position in normalized device coordinates
            pointer.x = (event.clientX / gl.domElement.clientWidth) * 2 - 1;
            pointer.y = -(event.clientY / gl.domElement.clientHeight) * 2 + 1;

            // Update raycaster
            raycaster.setFromCamera(pointer, camera);

            // Check for intersections with the terrain
            if (terrainRef.current) {
                const intersects = raycaster.intersectObject(terrainRef.current);

                if (intersects.length > 0) {
                    const intersect = intersects[0];

                    if (helperRef.current) {
                        // Reset position and look at normal
                        helperRef.current.position.set(0, 0, 0);
                        if (intersect.face) {
                            helperRef.current.lookAt(intersect.face.normal);
                        }
                        // Then copy intersection point
                        helperRef.current.position.copy(intersect.point);
                    }
                    setPointerOnTerrain(true);
                } else {
                    setPointerOnTerrain(false);
                }
            }
        };

        // Add event listener
        window.addEventListener('mousemove', handlePointerMove);

        // Clean up
        return () => {
            window.removeEventListener('mousemove', handlePointerMove);
        };
    }, [camera, gl, pointer, raycaster]);

    // Create helper cone geometry matching the demo
    const helperGeometry = useMemo(() => {
        const geometry = new THREE.ConeGeometry(20, 100, 3);
        geometry.translate(0, 50, 0);
        geometry.rotateX(Math.PI / 2);
        return geometry;
    }, []);

    return (
        <>
            {/* Helper cone that follows the mouse */}
            <mesh
                ref={helperRef}
                geometry={helperGeometry}
                visible={pointerOnTerrain}
            >
                <meshNormalMaterial />
            </mesh>

            <mesh
                ref={terrainRef}
                geometry={geometry}
                onClick={e => {
                    if (onClick) {
                        // Get intersection point in world coordinates
                        const point = e.point;
                        onClick([point.x, point.y, point.z]);
                    }
                }}
            >
                {terrainTexture ? (
                    <meshBasicMaterial
                        map={terrainTexture}
                    />
                ) : (
                    <meshBasicMaterial
                        color="green"
                    />
                )}
            </mesh>
        </>
    );
}

// Terrain engine
// uses height-map images (grey-scale)
// Terrain is built in a WebWorker in tiles, only visible tiles are built so the size of the terrain has very little impact on the load times
// Only visible terrain tiles are being rendered, so run-time performance is independent of the terrain size
// Automatically built ambient occlusion map
// Ray-casting API