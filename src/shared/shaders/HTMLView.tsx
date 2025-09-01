import { useThree, useFrame } from "@react-three/fiber";
import { CSS3DRenderer, CSS3DObject, OrbitControls } from "three-stdlib";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const HTMLView = ({ children }: { children?: React.ReactNode }) => {
    const { scene, camera, gl } = useThree();
    const controlsRef = useRef<OrbitControls | null>(null);
    const rendererRef = useRef<CSS3DRenderer | null>(null);

    useEffect(() => {
        // Set pixel ratio
        gl.setPixelRatio(window.devicePixelRatio);

        // Create CSS3DRenderer
        const rendererCSS3D = new CSS3DRenderer();
        rendererCSS3D.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(rendererCSS3D.domElement);
        rendererCSS3D.domElement.style.position = 'absolute';
        rendererCSS3D.domElement.style.top = '0';
        rendererCSS3D.domElement.style.pointerEvents = 'none';
        rendererRef.current = rendererCSS3D;


        // Add CSS3D element
        const iframe = document.createElement('iframe');
        iframe.style.width = '1028px';
        iframe.style.height = '768px';
        iframe.style.border = '0px';
        iframe.src = 'https://threejs.org/examples/#webgl_animation_keyframes';
        const css3dObject = new CSS3DObject(iframe);
        css3dObject.scale.set(0.001, 0.001, 0.001); // Scale down to make it smaller
        scene.add(css3dObject);

        // Handle resize
        const onWindowResize = () => {
            (camera as THREE.PerspectiveCamera).aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            gl.setSize(window.innerWidth, window.innerHeight);
            rendererCSS3D.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onWindowResize);


        // Raycast to find CSS3DObject
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const onPointerMove = (event: PointerEvent) => {
            // if (isDragging) return;
            pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
            pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(pointer, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);
            gl.domElement.style.pointerEvents = '';
            if (intersects.length > 0) {
                const object = intersects[0].object;
                if (object.name === 'cutout') {
                    gl.domElement.style.pointerEvents = 'none';
                }
            }
        };
        document.addEventListener('pointermove', onPointerMove);

        // Cleanup
        return () => {
            document.body.removeChild(rendererCSS3D.domElement);
            window.removeEventListener('resize', onWindowResize);
            document.removeEventListener('pointermove', onPointerMove);
            // controls.dispose();
            // scene.remove(room, hemisphereLight, frame);
            // Remove iframe CSS3DObject if needed, but since scene is managed by R3F, perhaps not necessary
        };
    }, [scene, camera, gl]);

    useFrame(() => {
        if (controlsRef.current) {
            controlsRef.current.update();
        }
        if (rendererRef.current) {
            rendererRef.current.render(scene, camera);
        }
    });

    return (
        <mesh name={'cutout'}>
            <planeGeometry args={[1.024, 7.68]} />
            <meshBasicMaterial color="white" opacity={0} transparent blending={THREE.NoBlending} premultipliedAlpha />
            {children}
        </mesh>
    );
};

export default HTMLView;