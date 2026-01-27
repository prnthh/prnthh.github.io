"use client";

import { useRef, useState, useEffect } from "react";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { Mesh, Vector2, Raycaster } from "three";
import { useThree } from "@react-three/fiber";
import { InteractionManager, InteractionPriority } from "@/app/react-three-controller/controls/InputStore";

interface ButtonBoxProps {
  position?: [number, number, number];
  onActivate?: () => void;
  interactionRadius?: number;
}

export default function ButtonBox({ position = [0, 1, 0], onActivate, interactionRadius = 3 }: ButtonBoxProps) {
  const boxRef = useRef<Mesh>(null);
  const buttonRef = useRef<Mesh>(null);
  const [isInRange, setIsInRange] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  const { camera } = useThree();
  const raycaster = useRef(new Raycaster());
  const claimId = useRef(`button-${Math.random()}`);
  const prevFireRef = useRef(false);
  const clickDetectedRef = useRef(false);

  const isPlayer = (event: any) => {
    const name = event?.other?.rigidBodyObject?.name;
    return name === 'bob';
  };

  const handleSensorEnter = (event: any) => {
    if (!isPlayer(event)) return;
    setIsInRange(true);
  };

  const handleSensorExit = (event: any) => {
    if (!isPlayer(event)) return;
    setIsInRange(false);
    setIsHovered(false);
    InteractionManager.release(claimId.current);
  };

  // Listen for mouse clicks directly
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) clickDetectedRef.current = true;
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) clickDetectedRef.current = false;
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useFrame(() => {
    if (!buttonRef.current) return;

    // When out of range, clear hover state
    if (!isInRange) {
      if (isHovered) {
        setIsHovered(false);
        InteractionManager.release(claimId.current);
      }
      return;
    }

    // Only raycast when player is in range
    raycaster.current.setFromCamera(new Vector2(0, 0), camera);
    const intersects = raycaster.current.intersectObject(buttonRef.current);
    const nowHovered = intersects.length > 0;

    // Claim/release priority to block weapon firing when hovering
    if (nowHovered && !isHovered) {
      InteractionManager.claim(claimId.current, InteractionPriority.INTERACTIVE_OBJECTS, ['fire']);
    } else if (!nowHovered && isHovered) {
      InteractionManager.release(claimId.current);
    }
    setIsHovered(nowHovered);

    // Activate button on click while hovering
    if (nowHovered && clickDetectedRef.current && !prevFireRef.current) {
      setIsPressed(true);
      setIsActivated(prev => !prev);
      onActivate?.();
      setTimeout(() => setIsPressed(false), 200);
    }

    prevFireRef.current = clickDetectedRef.current;
  });

  // Cleanup on unmount
  useEffect(() => () => InteractionManager.release(claimId.current), []);

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <CylinderCollider
        args={[1, interactionRadius]}
        position={[0, 0.5, 0]}
        sensor
                onIntersectionEnter={handleSensorEnter}
        onIntersectionExit={handleSensorExit}
      />
      <CuboidCollider args={[0.5, 0.5, 0.5]} />

      <mesh ref={boxRef} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={isActivated ? "#4ade80" : "#6b7280"} />
      </mesh>

      <mesh ref={buttonRef} position={[0, 0, .51]} castShadow>
        <boxGeometry args={[0.5, 0.5, isPressed ? 0.05 : 0.1]} />
        <meshStandardMaterial
          color={isHovered ? (isActivated ? "#22c55e" : "#ef4444") : (isActivated ? "#16a34a" : "#991b1b")}
          emissive={isHovered ? (isActivated ? "#22c55e" : "#ef4444") : "#000000"}
          emissiveIntensity={isHovered ? 0.3 : 0}
        />
      </mesh>

      {isHovered && (
        <mesh position={[0, 0, 0.51]}>
          <ringGeometry args={[0.3, 0.35, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
      )}
    </RigidBody>
  );
}
