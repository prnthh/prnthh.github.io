"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three/webgpu";
import { uniform } from "three/tsl";
import { pixelationPass } from "three/addons/tsl/display/PixelationPassNode.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default function PixelPage() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let disposed = false;

        // Effect settings
        const effectController = {
            pixelSize: uniform(6),
            normalEdgeStrength: uniform(0.3),
            depthEdgeStrength: uniform(0.4),
            pixelAlignedPanning: true,
        };

        // Camera (orthographic for clean pixel look)
        const aspectRatio = container.clientWidth / container.clientHeight;
        const camera = new THREE.OrthographicCamera(
            -aspectRatio, aspectRatio, 1, -1, 0.1, 10
        );
        camera.position.y = 2 * Math.tan(Math.PI / 6);
        camera.position.z = 2;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x151729);

        // Textures
        const loader = new THREE.TextureLoader();
        const texChecker = pixelTexture(loader.load("/textures/prototyping_textures_32x32px/Prototype_checkers_03_32x32px.png"));
        const texChecker2 = pixelTexture(loader.load("/textures/prototyping_textures_32x32px/Prototype_checkers_03_32x32px.png"));
        texChecker.repeat.set(3, 3);
        texChecker2.repeat.set(1.5, 1.5);

        // Meshes
        const boxMaterial = new THREE.MeshPhongNodeMaterial({ map: texChecker2 } as any);

        function addBox(boxSideLength: number, x: number, z: number, rotation: number) {
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(boxSideLength, boxSideLength, boxSideLength),
                boxMaterial
            );
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.rotation.y = rotation;
            mesh.position.set(x, boxSideLength / 2 + 0.0001, z);
            scene.add(mesh);
            return mesh;
        }

        addBox(0.4, 0, 0, Math.PI / 4);
        addBox(0.5, -0.5, -0.5, Math.PI / 4);

        const planeMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.MeshPhongNodeMaterial({ map: texChecker } as any)
        );
        planeMesh.receiveShadow = true;
        planeMesh.rotation.x = -Math.PI / 2;
        scene.add(planeMesh);

        const crystalMesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.2),
            new THREE.MeshPhongNodeMaterial({
                color: 0x68b7e9,
                emissive: 0x4f7e8b,
                shininess: 10,
                specular: 0xffffff,
            } as any)
        );
        crystalMesh.receiveShadow = true;
        crystalMesh.castShadow = true;
        scene.add(crystalMesh);

        // Lights
        scene.add(new THREE.AmbientLight(0x757f8e, 3));

        const directionalLight = new THREE.DirectionalLight(0xfffecd, 1.5);
        directionalLight.position.set(100, 100, 100);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set(2048, 2048);
        scene.add(directionalLight);

        const spotLight = new THREE.SpotLight(0xffc100, 10, 10, Math.PI / 16, 0.02, 2);
        spotLight.position.set(2, 2, 0);
        spotLight.target.position.set(0, 0, 0);
        spotLight.castShadow = true;
        scene.add(spotLight);
        scene.add(spotLight.target);

        // Renderer (WebGPU)
        const renderer = new THREE.WebGPURenderer({ antialias: false });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);

        // Post-processing with pixelation pass
        const postProcessing = new THREE.PostProcessing(renderer);
        const scenePass = pixelationPass(
            scene,
            camera,
            effectController.pixelSize,
            effectController.normalEdgeStrength,
            effectController.depthEdgeStrength
        );
        postProcessing.outputNode = scenePass;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.maxZoom = 2;

        // Timer
        const clock = new THREE.Clock();

        // Animation
        const animate = () => {
            if (disposed) return;

            const t = clock.getElapsedTime();

            // Animate crystal
            crystalMesh.material.emissiveIntensity = Math.sin(t * 3) * 0.5 + 0.5;
            crystalMesh.position.y = 0.7 + Math.sin(t * 2) * 0.05;
            crystalMesh.rotation.y = stopGoEased(t, 2, 4) * 2 * Math.PI;

            // Pixel-aligned panning
            const rendererSize = renderer.getSize(new THREE.Vector2());
            const ar = rendererSize.x / rendererSize.y;

            if (effectController.pixelAlignedPanning) {
                const pixelSize = effectController.pixelSize.value;
                pixelAlignFrustum(
                    camera, ar,
                    Math.floor(rendererSize.x / pixelSize),
                    Math.floor(rendererSize.y / pixelSize)
                );
            } else if (camera.left !== -ar || camera.top !== 1.0) {
                camera.left = -ar;
                camera.right = ar;
                camera.top = 1.0;
                camera.bottom = -1.0;
                camera.updateProjectionMatrix();
            }

            postProcessing.render();
        };

        renderer.setAnimationLoop(animate);

        // Resize handler
        const onResize = () => {
            const ar = container.clientWidth / container.clientHeight;
            camera.left = -ar;
            camera.right = ar;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener("resize", onResize);

        // Cleanup
        return () => {
            disposed = true;
            renderer.setAnimationLoop(null);
            window.removeEventListener("resize", onResize);
            controls.dispose();
            renderer.dispose();
            container.removeChild(renderer.domElement);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{ width: "100vw", height: "100vh", overflow: "hidden" }}
        />
    );
}

// --- Helper functions ---

function pixelTexture(texture: THREE.Texture) {
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function easeInOutCubic(x: number) {
    return x ** 2 * 3 - x ** 3 * 2;
}

function linearStep(x: number, edge0: number, edge1: number) {
    const w = edge1 - edge0;
    const m = 1 / w;
    const y0 = -m * edge0;
    return THREE.MathUtils.clamp(y0 + m * x, 0, 1);
}

function stopGoEased(x: number, downtime: number, period: number) {
    const cycle = (x / period) | 0;
    const tween = x - cycle * period;
    const linStep = easeInOutCubic(linearStep(tween, downtime, period));
    return cycle + linStep;
}

function pixelAlignFrustum(
    camera: THREE.OrthographicCamera,
    aspectRatio: number,
    pixelsPerScreenWidth: number,
    pixelsPerScreenHeight: number
) {
    const worldScreenWidth = (camera.right - camera.left) / camera.zoom;
    const worldScreenHeight = (camera.top - camera.bottom) / camera.zoom;
    const pixelWidth = worldScreenWidth / pixelsPerScreenWidth;
    const pixelHeight = worldScreenHeight / pixelsPerScreenHeight;

    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    const camRot = new THREE.Quaternion();
    camera.getWorldQuaternion(camRot);
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camRot);
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camRot);
    const camPosRight = camPos.dot(camRight);
    const camPosUp = camPos.dot(camUp);

    const camPosRightPx = camPosRight / pixelWidth;
    const camPosUpPx = camPosUp / pixelHeight;

    const fractX = camPosRightPx - Math.round(camPosRightPx);
    const fractY = camPosUpPx - Math.round(camPosUpPx);

    camera.left = -aspectRatio - fractX * pixelWidth;
    camera.right = aspectRatio - fractX * pixelWidth;
    camera.top = 1.0 - fractY * pixelHeight;
    camera.bottom = -1.0 - fractY * pixelHeight;
    camera.updateProjectionMatrix();
}
