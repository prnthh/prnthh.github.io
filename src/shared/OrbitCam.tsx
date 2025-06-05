import { Box } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import { Vector3, Group, MathUtils } from "three";

export const OrbitCam = ({
    radius = 3,
    minPolar = 0.1,
    maxPolar = Math.PI - 0.1,
    minAzimuth = -Infinity,
    maxAzimuth = Infinity,
    cameraSpeed = 0.03, // Slower default speed
    debug = false,
    smoothing = 0.1 // New prop for smoothing
}: {
    radius?: number,
    minPolar?: number,
    maxPolar?: number,
    minAzimuth?: number,
    maxAzimuth?: number,
    cameraSpeed?: number,
    debug?: boolean,
    smoothing?: number // Add smoothing prop
}) => {
    const azimuth = useRef(Math.PI / 2); // horizontal angle
    const polar = useRef(Math.PI / 2);   // vertical angle
    const dragging = useRef(false);
    const last = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
    const cameraTarget = useRef<Group>(null);
    const cameraLookAt = useRef<Vector3>(new Vector3());
    const radiusRef = useRef(radius); // Add a ref for radius
    const lastPosition = useRef<Vector3 | null>(null);
    const { camera, gl } = useThree();

    useEffect(() => {
        const dom = gl.domElement;
        let lastPinchDist: number | null = null; // Track last pinch distance
        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            dragging.current = true;
            if (e instanceof MouseEvent) {
                last.current = { x: e.clientX, y: e.clientY };
            } else if (e.touches && e.touches[0]) {
                last.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                if (e.touches.length === 2) {
                    // Store initial pinch distance
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    lastPinchDist = Math.sqrt(dx * dx + dy * dy);
                }
            }
        };
        const onPointerUp = () => { dragging.current = false; lastPinchDist = null; };
        const onPointerMove = (e: MouseEvent | TouchEvent) => {
            if (!dragging.current) return;
            // Pinch to zoom
            if (e instanceof TouchEvent && e.touches && e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (lastPinchDist !== null) {
                    const delta = (lastPinchDist - dist) * 0.01; // Sensitivity
                    radiusRef.current = MathUtils.clamp(
                        radiusRef.current + delta,
                        1,
                        20
                    );
                }
                lastPinchDist = dist;
                return;
            }
            let x, y;
            if (e instanceof MouseEvent) {
                x = e.clientX; y = e.clientY;
            } else if (e.touches && e.touches[0]) {
                x = e.touches[0].clientX; y = e.touches[0].clientY;
            } else return;
            const dx = x - last.current.x;
            const dy = y - last.current.y;
            last.current = { x, y };
            azimuth.current = MathUtils.clamp(
                azimuth.current - dx * 0.002, // Slower movement
                minAzimuth,
                maxAzimuth
            );
            polar.current = MathUtils.clamp(
                polar.current - dy * 0.002, // Slower movement
                minPolar,
                maxPolar
            );
        };
        // Add wheel event for zoom
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY * 0.01;
            radiusRef.current = MathUtils.clamp(
                radiusRef.current + delta,
                1,
                20
            );
        };
        dom.addEventListener("mousedown", onPointerDown);
        dom.addEventListener("touchstart", onPointerDown);
        window.addEventListener("mousemove", onPointerMove);
        window.addEventListener("touchmove", onPointerMove);
        window.addEventListener("mouseup", onPointerUp);
        window.addEventListener("touchend", onPointerUp);
        dom.addEventListener("wheel", onWheel, { passive: false });
        return () => {
            dom.removeEventListener("mousedown", onPointerDown);
            dom.removeEventListener("touchstart", onPointerDown);
            window.removeEventListener("mousemove", onPointerMove);
            window.removeEventListener("touchmove", onPointerMove);
            window.removeEventListener("mouseup", onPointerUp);
            window.removeEventListener("touchend", onPointerUp);
            dom.removeEventListener("wheel", onWheel);
        };
    }, [gl, minAzimuth, maxAzimuth, minPolar, maxPolar]);

    useFrame(() => {
        if (!cameraTarget.current) return;
        cameraTarget.current.getWorldPosition(cameraLookAt.current);
        const r = radiusRef.current;
        const x = r * Math.sin(polar.current) * Math.sin(azimuth.current);
        const y = r * Math.cos(polar.current);
        const z = r * Math.sin(polar.current) * Math.cos(azimuth.current);
        const desired = new Vector3(x, y, z).add(cameraLookAt.current);
        // Smoothly interpolate camera position
        camera.position.lerp(desired, smoothing);
        camera.lookAt(cameraLookAt.current);
    });

    return (
        <group ref={cameraTarget}>
            {debug && <Box args={[0.1, 0.1, 0.1]}><meshBasicMaterial wireframe color="green" /></Box>}
        </group>
    );
};
