import { RefObject } from "react";
import { AnimatedModelProps, AnimatedModelRef } from "../types";
import { RapierRigidBody } from "@react-three/rapier";

export interface RigidHumanoidModelRef extends AnimatedModelRef {
    rbref: RefObject<RapierRigidBody | null>;
}

export interface RigidHumanoidModelProps extends AnimatedModelProps {
    position?: [number, number, number];
    roundHeight?: number;
    unstable?: boolean;
    rbChildren?: React.ReactNode;
}