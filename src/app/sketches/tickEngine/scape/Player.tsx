import { FollowCam } from "@/shared/FollowCam";
import { OrbitCam } from "@/shared/OrbitCam";
import { useEffect, useRef, useState, forwardRef } from "react";
import AnimatedModel from "@/shared/HumanoidModel";
import * as THREE from "three";
import { Tween, Group, Easing } from "@tweenjs/tween.js";
import { useFrame } from "@react-three/fiber";
import { Box, Html } from "@react-three/drei";

interface PlayerProps {
  position: [number, number, number];
  health?: number;
  color?: string;
  onClick?: (e: any) => void;
  currentAction?: string;
  targetPosition?: [number, number, number];
  debug?: boolean;
}

const tweenGroup = new Group();

const Player = forwardRef<THREE.Group, PlayerProps>(({ position, health = 100, color = "orange", onClick, currentAction, targetPosition, debug }, ref) => {
  const groupRef = useRef<THREE.Group>(null);
  const rotationTweenRef = useRef<Tween<{ y: number }> | null>(null);
  const [animation, setAnimation] = useState("idle");
  const prevHealthRef = useRef(health);
  const lastTweenedPosRef = useRef(new THREE.Vector3(...position));
  const targetPosRef = useRef(new THREE.Vector3(...position));
  const movingRef = useRef(false);
  const animationTimeout = useRef<NodeJS.Timeout | null>(null);
  const [damage, setDamage] = useState<number | null>(null);
  const [showDamage, setShowDamage] = useState(false);

  // Forward the ref
  useEffect(() => {
    if (!ref) return;
    if (typeof ref === "function") ref(groupRef.current);
    else (ref as React.MutableRefObject<THREE.Group | null>).current = groupRef.current;
  }, [ref]);

  // Helpers
  const normalizeAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  const getTargetYaw = (from: THREE.Vector3, to: THREE.Vector3) => Math.atan2(to.x - from.x, to.z - from.z);

  // Set initial position
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...position);
      lastTweenedPosRef.current.copy(groupRef.current.position);
      targetPosRef.current.copy(groupRef.current.position);
      groupRef.current.rotation.y = 0;
    }
  }, []);

  // Move & rotate
  useEffect(() => {
    if (!groupRef.current) return;
    const group = groupRef.current;
    const currentPos = group.position.clone();
    const targetPos = new THREE.Vector3(...position);
    if (!currentPos.equals(targetPos)) {
      setAnimation("walk");
      targetPosRef.current.copy(targetPos);
      movingRef.current = true;
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
      if (animation !== "idle") setAnimation("idle");
      movingRef.current = false;
    }
  }, [position]);

  // Health/damage
  useEffect(() => {
    if (health < prevHealthRef.current) {
      setDamage(prevHealthRef.current - health);
      setShowDamage(true);
      setTimeout(() => setShowDamage(false), 500);
      setAnimation("hurt");
      if (animationTimeout.current) clearTimeout(animationTimeout.current);
      animationTimeout.current = setTimeout(() => setAnimation(movingRef.current ? "walk" : "idle"), 600);
    }
    prevHealthRef.current = health;
  }, [health]);

  // Action-based animation
  useEffect(() => {
    if (currentAction === "attack" && animation !== "punch") {
      setAnimation("punch");
      if (animationTimeout.current) clearTimeout(animationTimeout.current);
      animationTimeout.current = setTimeout(() => setAnimation(movingRef.current ? "walk" : "idle"), 500);
    } else if (currentAction === "extract" && animation !== "slash") {
      setAnimation("slash");
      if (animationTimeout.current) clearTimeout(animationTimeout.current);
    } else if (currentAction !== "extract" && animation === "slash") {
      setAnimation(movingRef.current ? "walk" : "idle");
    }
  }, [currentAction, animation]);

  // Face target
  useEffect(() => {
    if (!groupRef.current) return;
    if ((currentAction === "attack" || currentAction === "extract") && targetPosition) {
      const group = groupRef.current;
      const currentPos = group.position.clone();
      const targetPos = new THREE.Vector3(...targetPosition);
      const currentYaw = normalizeAngle(group.rotation.y);
      const targetYaw = normalizeAngle(getTargetYaw(currentPos, targetPos));
      const finalYaw = currentYaw + normalizeAngle(targetYaw - currentYaw);
      rotationTweenRef.current?.stop();
      const rotObj = { y: currentYaw };
      const rotationTween = new Tween(rotObj)
        .to({ y: finalYaw }, 180)
        .easing(Easing.Linear.None)
        .onUpdate(() => { group.rotation.y = normalizeAngle(rotObj.y); });
      tweenGroup.add(rotationTween);
      rotationTween.start();
      rotationTweenRef.current = rotationTween;
    }
  }, [currentAction, targetPosition]);

  useFrame((_, delta) => {
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
      lastTweenedPosRef.current.copy(currentPos);
      if (dist <= 0.01) {
        group.position.copy(targetPos);
        if (animation !== "idle") setAnimation("idle");
        movingRef.current = false;
      } else {
        if (animation !== "walk") setAnimation("walk");
      }
    }
  });

  return (
    <group ref={groupRef}>
      <AnimatedModel
        debug={debug}
        position={[0, -0.3, 0]}
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
        height={0.95}
        onClick={onClick}
        scale={0.8}
      />
      {color === 'orange' && <OrbitCam maxRadius={6} maxPolar={Math.PI / 2.2} />}
      <Html center position={[0, .7, 0]} style={{ pointerEvents: "none", minWidth: 60 }}>
        {debug && JSON.stringify(currentAction)}
        <div className="z-20" style={{ position: 'relative', width: 50, height: 14 }}>
          <div style={{ width: '100%', height: 7, background: '#a00', borderRadius: 5, overflow: 'hidden', border: '1px solid black' }}>
            <div style={{ width: `${Math.max(0, Math.min(health * 10, 100))}%`, height: '100%', background: 'linear-gradient(90deg, #0f0, #6f6)', transition: 'width 0.2s' }} />
          </div>
          {showDamage && damage !== null && (
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
    </group>
  );
});

export default Player;
