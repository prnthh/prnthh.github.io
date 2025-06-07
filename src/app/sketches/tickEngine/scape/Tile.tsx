"use client";
import { useState } from "react";

interface TileProps {
  position: [number, number, number];
  type: number;
  onClick?: () => void;
  onTileClick?: (e: any) => void; // new prop
}

export default function Tile({ position, type, onClick, onTileClick, ...props }: TileProps) {
  return (
    <mesh
      position={position}
      scale={[1, 0.1, 1]}
      onClick={e => {
        onClick?.();
        onTileClick?.(e);
      }}
      {...props}
    >
      <boxGeometry args={[0.66, 0.1, 0.66]} />
      <meshStandardMaterial color={"lightgrey"} />
    </mesh>
  );
}
