import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { RefObject, useRef } from "react";

import { Matrix4, Quaternion, Vector3 } from "three";
import { RigidHumanoidModelRef } from "../types";
import AimLine from "@/shared/TSLLine";

const WALK_SPEED = 1.0, RUN_SPEED = 1.8, RUN_DISTANCE = 3.0;
const TURN_SHARPNESS = 7.5, WHISKER = 0.8, SIDE_WHISKER = 0.55, SIDE_ANGLE = 0.6, AVOIDANCE_TURN = 0.9, RAY_OFFSET = 0.2;
const ARRIVE_DISTANCE = 0.5, BLOCKED_SPEED_FACTOR = 0.75;
const _pos = new Vector3(), _dir = new Vector3(), _vel = new Vector3(), _fwd = new Vector3();
const _quat = new Quaternion(), _tgt = new Quaternion(), _mat = new Matrix4(), _up = new Vector3(0, 1, 0);
const _left = new Vector3(), _right = new Vector3();

interface Props {
    debug?: boolean;
    rigidBodyRef: RefObject<RigidHumanoidModelRef | null>;
    setAnimation: (anim: "idle" | "walk" | "run") => void;
    position: [number, number, number];
    paused?: boolean;
    onDestinationReached?: () => void;
}

const SteeringBehavior = ({ debug, rigidBodyRef, setAnimation, position, paused, onDestinationReached }: Props) => {
    const { rapier, world } = useRapier();
    const arrived = useRef(true), blocked = useRef(false);

    useFrame((_, dt) => {
        const rb = rigidBodyRef.current?.rigidBodyRef?.current;
        if (!rb || paused) return;

        const p = rb.translation();
        _pos.set(p.x, p.y, p.z);
        _dir.set(...position).sub(_pos).setY(0);
        const distance = _dir.length();

        if (distance < ARRIVE_DISTANCE) {
            if (!arrived.current) { arrived.current = true; onDestinationReached?.(); }
            rb.setLinvel({ x: 0, y: rb.linvel().y, z: 0 }, true);
            setAnimation("idle");
            blocked.current = false;
            return;
        }
        arrived.current = false;
        _dir.normalize();

        const r = rb.rotation();
        _quat.set(r.x, r.y, r.z, r.w);
        _fwd.set(0, 0, 1).applyQuaternion(_quat);
        _fwd.setY(0).normalize();
        _left.copy(_fwd).applyAxisAngle(_up, SIDE_ANGLE);
        _right.copy(_fwd).applyAxisAngle(_up, -SIDE_ANGLE);

        const rayOrigin = { x: p.x + _fwd.x * RAY_OFFSET, y: p.y + 0.8, z: p.z + _fwd.z * RAY_OFFSET };
        const forwardHit = world.castRay(new rapier.Ray(rayOrigin, _fwd), WHISKER, true, undefined, undefined, undefined, rb);
        const leftHit = world.castRay(new rapier.Ray(rayOrigin, _left), SIDE_WHISKER, true, undefined, undefined, undefined, rb);
        const rightHit = world.castRay(new rapier.Ray(rayOrigin, _right), SIDE_WHISKER, true, undefined, undefined, undefined, rb);
        blocked.current = forwardHit !== null;

        if (blocked.current || leftHit || rightHit) {
            const turnDir = leftHit && !rightHit ? -1 : rightHit && !leftHit ? 1 : (_fwd.clone().cross(_dir).y >= 0 ? 1 : -1);
            _dir.copy(_fwd).applyAxisAngle(_up, turnDir * AVOIDANCE_TURN);
        }

        _mat.lookAt(_pos.clone().add(_dir), _pos, _up);
        _tgt.setFromRotationMatrix(_mat);

        _quat.slerp(_tgt, 1 - Math.exp(-TURN_SHARPNESS * dt));

        const shouldRun = distance > RUN_DISTANCE && !blocked.current;
        const baseSpeed = shouldRun ? RUN_SPEED : WALK_SPEED;
        _vel.set(0, 0, blocked.current ? baseSpeed * BLOCKED_SPEED_FACTOR : baseSpeed).applyQuaternion(_quat);
        rb.setRotation(_quat, true);
        rb.setLinvel({ x: _vel.x, y: rb.linvel().y, z: _vel.z }, true);
        setAnimation(shouldRun ? "run" : "walk");
    });

    const group = rigidBodyRef.current?.groupRef;
    return debug && !arrived.current && group ? <AimLine container={group} hit={blocked.current} length={WHISKER} offset={RAY_OFFSET} /> : null;
};

export default SteeringBehavior;
