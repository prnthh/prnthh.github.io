
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import DialogCollider from '@/shared/ped/DialogCollider';
import { RapierRigidBody, RigidBody } from '@react-three/rapier';
import { Object3D, Quaternion, Vector3 } from 'three';
import TextView from '../shaders/TextView';
import { Tween } from '@tweenjs/tween.js';

const PortalDoor = ({ position, rotation, label, children, onConfirm }:
    {
        position: [number, number, number],
        rotation: [number, number, number],
        label?: string,
        children: React.ReactNode,
        onConfirm?: () => void
    }) => {
    const [open, setOpen] = useState(false);
    const doorRef = useRef<Object3D | null>(null);
    const tweenRef = useRef<Tween | null>(null);

    useFrame((state) => {
        tweenRef.current?.update();
    });

    useEffect(() => {
        tweenRef.current?.stop();
        if (open) {
            if (doorRef.current && doorRef.current.rotation) {
                tweenRef.current = new Tween(doorRef.current.rotation)
                    .to({ y: -Math.PI / 2 }, 200)
                    .start();
            }
        } else {
            if (doorRef.current && doorRef.current.rotation) {
                tweenRef.current = new Tween(doorRef.current.rotation)
                    .to({ y: 0 }, 200)
                    .start();
            }
        }
    }, [open]);

    return (
        <group position={position} rotation={rotation}>
            <DialogCollider radius={0.8} onEnter={() => { setOpen(true); }}
                onExit={() => { setOpen(false); }}
            >
                {children}
            </DialogCollider>
            {/* <RigidBody ref={doorRef} type='fixed' position={[-0.4, 0.7, 0]}> */}
            <group ref={doorRef} position={[-0.4, 0.7, 0]}>
                <mesh position={[0.4, 0, 0]}>
                    {/* {label && <Html position={[0, 0.3, 0.1]} transform distanceFactor={2}>{label}</Html>} */}
                    <boxGeometry args={[0.8, 1.4, 0.1]} />
                    <meshStandardMaterial color="#59432b" />
                    <TextView color='#ffe054' position={[0, 0.25, 0.055]}>{label}</TextView>
                </mesh>
            </group>
            {/* </RigidBody> */}
            {open && <RigidBody sensor type='fixed' position={[-0.4, 0.7, 0]} onIntersectionEnter={() => {
                onConfirm?.();
            }}>
                <mesh position={[0.4, 0, -0.05]}>
                    <boxGeometry args={[0.8, 1.4, 0.05]} />
                    <meshStandardMaterial color="black" />
                </mesh>
            </RigidBody>}
        </group>
    );
};

export default PortalDoor;
