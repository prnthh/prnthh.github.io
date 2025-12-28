"use client";

import { useRef, useState, useEffect } from "react";
import { RigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { Mesh, Vector2, Raycaster } from "three";
import { useThree } from "@react-three/fiber";
import { InteractionManager, InteractionPriority } from "@/app/react-three-controller/controls/InputStore";

interface ButtonBoxProps {
  position?: [number, number, number];
  onActivate?: () => void;
}

export default function ButtonBox({ position = [0, 1, 0], onActivate }: ButtonBoxProps) {
  const boxRef = useRef<Mesh>(null);
  const buttonRef = useRef<Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  const { camera } = useThree();
  const raycaster = useRef(new Raycaster());
  const claimId = useRef(`button-${Math.random()}`);
  const prevFireRef = useRef(false);
  const clickDetectedRef = useRef(false);

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

    // Check if looking at button
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
    <RigidBody type="fixed" position={position}>
      <mesh ref={boxRef} castShadow receiveShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color={isActivated ? "#4ade80" : "#6b7280"} />
      </mesh>

      <mesh ref={buttonRef} position={[0, 0, 1.01]} castShadow>
        <boxGeometry args={[0.5, 0.5, isPressed ? 0.05 : 0.1]} />
        <meshStandardMaterial
          color={isHovered ? (isActivated ? "#22c55e" : "#ef4444") : (isActivated ? "#16a34a" : "#991b1b")}
          emissive={isHovered ? (isActivated ? "#22c55e" : "#ef4444") : "#000000"}
          emissiveIntensity={isHovered ? 0.3 : 0}
        />
      </mesh>

      {isHovered && (
        <mesh position={[0, 0, 1.06]}>
          <ringGeometry args={[0.3, 0.35, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
      )}
    </RigidBody>
  );
}
