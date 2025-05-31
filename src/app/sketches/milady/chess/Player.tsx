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
}

const tweenGroup = new Group(); // ✅ your own tween group

const Player = forwardRef<THREE.Group, PlayerProps>(({ position, health = 100, color = "orange", onClick }, ref) => {
  const groupRef = useRef<THREE.Group>(null);
  const rotationTweenRef = useRef<Tween<{ y: number }> | null>(null);
  const [animation, setAnimation] = useState("idle");
  const lastTweenedPosRef = useRef<THREE.Vector3>(new THREE.Vector3(...position));
  const targetPosRef = useRef<THREE.Vector3>(new THREE.Vector3(...position));
  const movingRef = useRef(false);

  // Forward the ref
  useEffect(() => {
    if (!ref) return;
    if (typeof ref === "function") {
      ref(groupRef.current);
    } else {
      (ref as React.MutableRefObject<THREE.Group | null>).current = groupRef.current;
    }
  }, [ref]);

  // Helper to get yaw angle to target
  function getTargetYaw(from: THREE.Vector3, to: THREE.Vector3) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    return Math.atan2(dx, dz);
  }

  // Set initial position and rotation on mount
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...position);
      lastTweenedPosRef.current.copy(groupRef.current.position); // sync
      targetPosRef.current.copy(groupRef.current.position);
      groupRef.current.rotation.y = 0;
    }
  }, []);

  // Update target position on prop change
  useEffect(() => {
    if (!groupRef.current) return;
    const group = groupRef.current;
    const currentPos = group.position.clone();
    const targetPos = new THREE.Vector3(...position);
    if (!currentPos.equals(targetPos)) {
      setAnimation("walk");
      targetPosRef.current.copy(targetPos);
      movingRef.current = true;
      // --- ROTATION ---
      const currentYaw = group.rotation.y;
      const targetYaw = getTargetYaw(currentPos, targetPos);
      let deltaYaw = targetYaw - currentYaw;
      if (deltaYaw > Math.PI) deltaYaw -= 2 * Math.PI;
      if (deltaYaw < -Math.PI) deltaYaw += 2 * Math.PI;
      const finalYaw = currentYaw + deltaYaw;
      rotationTweenRef.current?.stop();
      const rotObj = { y: currentYaw };
      const rotationTween = new Tween(rotObj)
        .to({ y: finalYaw }, 200)
        .easing(Easing.Linear.None)
        .onUpdate(() => {
          if (group) group.rotation.y = rotObj.y;
        });
      tweenGroup.add(rotationTween);
      rotationTween.start();
      rotationTweenRef.current = rotationTween;
    } else {
      // If not moving, ensure animation is idle
      if (animation !== "idle") setAnimation("idle");
      movingRef.current = false;
    }
  }, [position]);

  useFrame((_, delta) => {
    tweenGroup.update(performance.now());
    if (!groupRef.current) return;
    const group = groupRef.current;
    const targetPos = targetPosRef.current;
    const currentPos = group.position;
    // Move at a constant speed (units per second)
    const speed = 1.3; // adjust as needed
    const dist = currentPos.distanceTo(targetPos);
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
    <>
      <group ref={groupRef}>
        <AnimatedModel
          position={[0, -0.3, 0]}
          debug={true}
          model={"/models/milady.glb"}
          animation={animation}
          height={1.7}
          onClick={onClick}
          scale={0.8}
        />
        {color == 'orange' && <OrbitCam maxPolar={Math.PI / 2.2} />}
      </group>
      <Html center position={[position[0], position[1] + .7, position[2]]} style={{ pointerEvents: "none" }}>
        <div className="text-white bg-black p-1 rounded">
          {`HP:${health ?? 0}`}
        </div>
      </Html>
    </>
  );
});

export default Player;
