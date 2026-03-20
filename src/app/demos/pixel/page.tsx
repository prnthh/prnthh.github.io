"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function PixelPage() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        // Camera
        const camera = new THREE.PerspectiveCamera(
            60,
            container.clientWidth / container.clientHeight,
            0.1,
            100
        );
        camera.position.set(0, 2, 5);
        camera.lookAt(0, 0, 0);

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambient);

        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(5, 10, 7);
        scene.add(directional);

        // Objects
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0xe94560 });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.y = 0.5;
        scene.add(box);

        const planeGeo = new THREE.PlaneGeometry(10, 10);
        const planeMat = new THREE.MeshStandardMaterial({ color: 0x16213e });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        scene.add(plane);

        // Animation loop
        let frameId: number;
        const clock = new THREE.Clock();

        const animate = () => {
            frameId = requestAnimationFrame(animate);
            const t = clock.getElapsedTime();
            box.rotation.y = t;
            box.rotation.x = t * 0.5;
            renderer.render(scene, camera);
        };
        animate();

        // Resize handler
        const onResize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener("resize", onResize);

        // Cleanup
        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener("resize", onResize);
            renderer.dispose();
            boxGeo.dispose();
            boxMat.dispose();
            planeGeo.dispose();
            planeMat.dispose();
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
