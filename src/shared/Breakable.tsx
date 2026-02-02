import * as THREE from 'three';
import { useEffect, useState, useRef, ReactNode, cloneElement, isValidElement, useCallback } from 'react';
import { applyProps, useThree, ThreeEvent } from '@react-three/fiber';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import { ConvexObjectBreaker } from 'three-stdlib';

const breaker = new ConvexObjectBreaker();

interface BreakableProps {
    children: ReactNode;
    maxPieces?: number;
    /** Initial physics type - 'fixed' (static) or 'dynamic' */
    type?: 'fixed' | 'dynamic';
    /** Physics properties */
    restitution?: number;
    friction?: number;
    /** Whether to apply initial random velocity */
    initialVelocity?: boolean;
    /** Custom impact force multiplier */
    impactForce?: number;
    /** Collider type */
    colliders?: 'hull' | 'cuboid' | 'ball';
}

export default function Breakable({
    children,
    maxPieces = 30,
    type = 'fixed',
    restitution = 0.1,
    friction = 0.25,
    initialVelocity = false,
    impactForce = 2,
    colliders = 'hull',
}: BreakableProps) {
    const camera = useThree((state) => state.camera);
    const [shards, setShards] = useState<THREE.Mesh[]>([]);
    const [baseMesh, setBaseMesh] = useState<THREE.Mesh | null>(null);

    const setBaseRef = useCallback((node: THREE.Mesh | null) => {
        if (node && !baseMesh) setBaseMesh(node);
    }, [baseMesh]);

    const handleBreak = (e: ThreeEvent<MouseEvent>, mesh: THREE.Mesh | null, api: RapierRigidBody) => {
        e.stopPropagation();

        const meshToBreak = mesh ?? (e.object as THREE.Mesh | undefined);
        if (!meshToBreak) return;

        // Calculate shards
        const pieces = breaker.subdivideByImpact(
            meshToBreak,
            e.point.clone(),
            camera.getWorldPosition(new THREE.Vector3()).sub(e.point.clone()).normalize(),
            impactForce,
            1
        ) as THREE.Mesh[];

        if (shards.length < maxPieces && pieces.length > 1) {
            const localPos = meshToBreak.position.clone();
            const localQuat = meshToBreak.quaternion.clone();

            setShards([
                ...pieces.map((piece) => {
                    const shard = piece as THREE.Mesh;
                    shard.userData.shard = true;
                    return applyProps(shard, {
                        scale: meshToBreak.scale,
                        position: localPos,
                        quaternion: localQuat,
                    }) as THREE.Mesh;
                }),
            ]);
        } else {
            // If no shards, just nudge it slightly
            api.setLinvel({ x: 0, y: 3, z: 0 }, true);
            api.setAngvel(
                {
                    x: Math.random() * 2 - 1,
                    y: Math.random() * 2 - 1,
                    z: Math.random() * 2 - 1,
                },
                true
            );
        }
    };

    return (
        <>
            {shards.length > 0
                ? shards.map((mesh) => (
                    <BreakablePiece
                        key={mesh.uuid}
                        mesh={mesh}
                        onPointerDown={(e, api) => handleBreak(e, mesh, api)}
                        type={'dynamic'}
                        restitution={restitution}
                        friction={friction}
                        initialVelocity={true}
                        colliders={colliders}
                    />
                ))
                : isValidElement(children) && (
                    <BreakablePiece
                        mesh={baseMesh}
                        onPointerDown={(e, api) => handleBreak(e, baseMesh, api)}
                        type={type}
                        restitution={restitution}
                        friction={friction}
                        initialVelocity={initialVelocity}
                        colliders={colliders}
                        renderOriginal={children}
                        setBaseRef={setBaseRef}
                    />
                )}
        </>
    );
}

interface BreakablePieceProps {
    mesh: THREE.Mesh | null;
    renderOriginal?: ReactNode;
    setBaseRef?: (node: THREE.Mesh | null) => void;
    onPointerDown: (e: ThreeEvent<MouseEvent>, api: RapierRigidBody) => void;
    type: 'fixed' | 'dynamic';
    restitution: number;
    friction: number;
    initialVelocity: boolean;
    colliders: 'hull' | 'cuboid' | 'ball';
}

function BreakablePiece({
    mesh,
    renderOriginal,
    setBaseRef,
    onPointerDown,
    type,
    restitution,
    friction,
    initialVelocity,
    colliders,
}: BreakablePieceProps) {
    const api = useRef<RapierRigidBody>(null);

    useEffect(() => {
        if (!api.current || !mesh) return;

        // Prepare the mesh for breaking if it's not already a shard
        if (!mesh.userData.shard) {
            breaker.prepareBreakableObject(
                mesh,
                0,
                new THREE.Vector3(),
                new THREE.Vector3(),
                true
            );
        }
        const geometry = mesh.geometry as THREE.BufferGeometry | undefined;
        if (geometry?.index) {
            const nonIndexed = geometry.toNonIndexed();
            nonIndexed.computeVertexNormals();
            mesh.geometry = nonIndexed;
        }

        // Apply initial velocity
        if (initialVelocity) {
            api.current.setLinvel(
                {
                    x: THREE.MathUtils.randFloatSpread(20),
                    y: 20,
                    z: THREE.MathUtils.randFloatSpread(20),
                },
                true
            );
            api.current.setAngvel(
                {
                    x: Math.random() * 10 - 5,
                    y: Math.random() * 10 - 5,
                    z: Math.random() * 10 - 5,
                },
                true
            );
        }
    }, [initialVelocity, mesh]);

    return (
        <RigidBody
            ref={api}
            restitution={restitution}
            friction={friction}
            type={type}
            colliders={colliders}
            onIntersectionEnter={(e: any) => {
                // Match ped-style bullet check
                if (e.other?.rigidBody?.userData?.type === 'bullet' && api.current) {
                    const t = e.other.rigidBody.translation();
                    const bulletPos = new THREE.Vector3(t.x, t.y, t.z);
                    const fakeEvent = {
                        stopPropagation: () => { },
                        point: bulletPos,
                    } as ThreeEvent<MouseEvent>;
                    onPointerDown(fakeEvent, api.current);
                }
            }}
        >
            {renderOriginal ? (
                <>{cloneElement(renderOriginal as any, {
                    ref: setBaseRef,
                    onPointerDown: (e: ThreeEvent<MouseEvent>) => {
                        if (api.current) onPointerDown(e, api.current);
                    },
                })}</>
            ) : (
                mesh && (
                    <primitive
                        castShadow
                        receiveShadow
                        object={mesh}
                        onPointerDown={(e: ThreeEvent<MouseEvent>) => {
                            if (api.current) onPointerDown(e, api.current);
                        }}
                    />
                )
            )}
        </RigidBody>
    );
}
