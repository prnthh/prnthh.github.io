import React, { useState, useEffect, useRef } from "react";
import { useRoom } from "./ColyseusProvider";
import { Html } from "@react-three/drei";
import { Player } from "../../../server/src/rooms/schema/MyRoomState";
import AnimatedModel from "@/shared/HumanoidModel";
import * as THREE from "three";
import { Tween, Group, Easing } from "@tweenjs/tween.js";
import { useFrame } from "@react-three/fiber";

const PlayerModels = () => {
    const { room, state, offlineState } = useRoom();
    const players = state?.players || offlineState?.players || {};
    const sessionId = room?.sessionId || "offline";
    const localPlayer = Object.values(players).find((p: any) => p.id === sessionId);

    return (
        <>
            {/* Local player */}
            <BaseModel isPlayer={true} player={localPlayer as Player} />

            {/* Other players */}
            {Object.entries(players).map(([id, player]) => {
                if (id === sessionId) return null;
                return (
                    <BaseModel
                        key={id}
                        isPlayer={false}
                        player={player as Player}
                    />
                );
            })}
        </>
    );
}

const tweenGroup = new Group();

const BaseModel = ({ isPlayer, player }: { isPlayer?: boolean, player?: Player }) => {
    const groupRef = useRef<THREE.Group>(null);
    const rotationTweenRef = useRef<Tween<{ y: number }> | null>(null);
    const targetPosRef = useRef(new THREE.Vector3(player?.position?.x || 0, player?.position?.y || 0, player?.position?.z || 0));
    const movingRef = useRef(false);
    const [animation, setAnimation] = useState("idle");
    const hasInitializedRef = useRef(false);

    // Move hooks above the early return
    useEffect(() => {
        if (!player) return;
        if (groupRef.current && !hasInitializedRef.current) {
            const group = groupRef.current;
            group.position.set(player.position.x, player.position.y, player.position.z);
            targetPosRef.current.set(player.position.x, player.position.y, player.position.z);
            hasInitializedRef.current = true;
        }
    }, [player?.id]);

    useEffect(() => {
        if (!player) return;
        if (groupRef.current) {
            const group = groupRef.current;
            const currentPos = group.position.clone();
            const targetPos = new THREE.Vector3(player.position?.x || 0, player.position?.y || 0, player.position?.z || 0);
            if (!currentPos.equals(targetPos)) {
                targetPosRef.current.copy(targetPos);
                movingRef.current = true;
                setAnimation("walk");
                const normalizeAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
                const getTargetYaw = (from: THREE.Vector3, to: THREE.Vector3) => Math.atan2(to.x - from.x, to.z - from.z);
                const currentYaw = normalizeAngle(group.rotation.y);
                const targetYaw = normalizeAngle(getTargetYaw(currentPos, targetPos));
                const finalYaw = currentYaw + normalizeAngle(targetYaw - currentYaw);
                rotationTweenRef.current?.stop();
                const rotObj = { y: currentYaw };
                const rotationTween = new Tween(rotObj)
                    .to({ y: finalYaw }, 200)
                    .easing(Easing.Linear.None)
                    .onUpdate(() => { group.rotation.y = normalizeAngle(rotObj.y); });
                tweenGroup.add(rotationTween);
                rotationTween.start();
                rotationTweenRef.current = rotationTween;
            } else {
                movingRef.current = false;
                setAnimation("idle");
            }
        }
    }, [player?.position?.x, player?.position?.y, player?.position?.z]);

    useFrame((_, delta) => {
        if (!player) return;
        tweenGroup.update(performance.now());
        if (!groupRef.current) return;
        const group = groupRef.current;
        const targetPos = targetPosRef.current;
        const currentPos = group.position;
        const baseSpeed = 1.3;
        const dist = currentPos.distanceTo(targetPos);
        const slowRadius = 0.2;
        const speed = dist < slowRadius ? Math.max(baseSpeed * dist / slowRadius, 0.2) : baseSpeed;
        if (dist > 0.001) {
            const direction = new THREE.Vector3().subVectors(targetPos, currentPos).normalize();
            const moveDist = Math.min(speed * delta, dist);
            currentPos.addScaledVector(direction, moveDist);
            if (dist <= 0.01) {
                group.position.copy(targetPos);
                movingRef.current = false;
                setAnimation("idle");
            } else {
                movingRef.current = true;
                setAnimation("walk");
            }
        }
    });

    if (!player) return null;

    const pos = (player as Player).position;

    return <>
        <mesh position={[pos.x, pos.y, pos.z]} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={isPlayer ? "orange" : "blue"} wireframe />
        </mesh>
        <group ref={groupRef}>

            <AnimatedModel
                height={0.5}
                basePath="/models/human/rigga/"
                model={"/rigga.glb"}
                animation={animation}
                animationOverrides={{
                    idle: '/anim/idle.fbx',
                    walk: '/anim/walk.fbx',
                    run: '/anim/run.fbx',
                    jump: '/anim/jump.fbx',
                    punch: '/anim/punch.fbx',
                    hurt: '/anim/hurt.fbx',
                    slash: '/anim/slash.fbx',
                }}
                scale={0.8}
            >
                <HealthBar player={player as Player} />
            </AnimatedModel>
        </group>
    </>
}

const HealthBar = ({ player }: { player: Player }) => {
    const health = player?.status?.health || 100; // Default to 100 if not set

    const [damage, setDamage] = useState<number | null>(null);

    return <Html position={[0, 2, 0]}>
        <div className="z-20 -translate-1/2" style={{ position: 'relative', width: 50, height: 14 }}>
            <div style={{ width: '100%', height: 7, background: '#a00', borderRadius: 5, overflow: 'hidden', border: '1px solid black' }}>
                <div style={{ width: `${Math.max(0, Math.min(health * 10, 100))}%`, height: '100%', background: 'linear-gradient(90deg, #0f0, #6f6)', transition: 'width 0.2s' }} />
            </div>
            {damage !== null && (
                <div style={{ position: 'absolute', left: '50%', top: 22, transform: 'translateX(-50%)', background: 'rgba(255,0,0,0.85)', color: '#fff', padding: '2px 8px', borderRadius: 12, fontWeight: 700, fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', pointerEvents: 'none', zIndex: 2, animation: 'damage-pop 0.5s cubic-bezier(.5,-0.5,.5,1.5)' }}>
                    -{damage}
                </div>
            )}
        </div>

        <style>{`
        @keyframes damage-pop {
          0% { opacity: 0; transform: translateX(-50%) scale(0.7) translateY(10px); }
          20% { opacity: 1; transform: translateX(-50%) scale(1.1) translateY(-2px); }
          80% { opacity: 1; transform: translateX(-50%) scale(1) translateY(-8px); }
          100% { opacity: 0; transform: translateX(-50%) scale(0.9) translateY(-18px); }
        }
      `}</style>
    </Html>
}

export default PlayerModels;