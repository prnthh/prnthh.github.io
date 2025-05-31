"use client";
import { useState } from "react";

interface TileProps {
  position: [number, number, number];
  type: number;
  onClick?: () => void;
  isTarget?: boolean; // highlight if this is the target
}

export default function Tile({ position, type, onClick, isTarget, ...props }: TileProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <mesh
      position={position}
      scale={[1, 0.1, 1]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={onClick}
      {...props}
    >
      <boxGeometry args={[0.66, 0.1, 0.66]} />
      <meshStandardMaterial color={isTarget ? "red" : hovered ? "hotpink" : type === 1 ? "gray" : "white"} />
    </mesh>
  );
}
