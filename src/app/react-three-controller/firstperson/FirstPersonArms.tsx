/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license found in the LICENSE
 * file in the root directory of this source tree.
 */

import { RapierRigidBody } from "@react-three/rapier";
import { useState, useCallback, RefObject } from "react";
import { Weapon, Gun } from "../Weapon";
import { RigidHumanoidModelRef } from "../ped/types";

export const FirstPersonArms = ({ rigidBodyRef, modelRef, gunModel }: { rigidBodyRef?: RefObject<RapierRigidBody | null>, modelRef?: RefObject<RigidHumanoidModelRef | null>, gunModel?: string }) => {
    const [rightHand, setRightHand] = useState<'gun' | 'pick' | 'unarmed'>("gun");
    const [isFlashing, setIsFlashing] = useState(false);
    const handleFire = useCallback(() => {
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 150);
        // onFire?.();
    }, []);

    // Extract rigidBodyRef from modelRef if provided
    const rbRef = modelRef?.current?.rigidBodyRef || rigidBodyRef || { current: null };

    return <>
        {rightHand === 'gun' && <group position={[0.2, -0.2, -0.5]} scale={0.5}>
            <Gun isFlashing={isFlashing} model={gunModel} />
            <Weapon excludeRigidBody={rbRef} onFire={handleFire} />
        </group>}
    </>
}