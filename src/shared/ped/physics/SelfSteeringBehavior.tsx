import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { RefObject, useRef } from "react";
import { Matrix4, Quaternion, Vector3 } from "three";
import { RigidHumanoidModelRef } from "../types";
import AimLine from "@/shared/TSLLine";

const WALK_SPEED = 1.0, RUN_SPEED = 1.8, RUN_DISTANCE = 3.0, SMOOTHING = 0.05, WHISKER = 0.6, RAY_OFFSET = 0.2;
const _pos = new Vector3(), _dir = new Vector3(), _vel = new Vector3(), _fwd = new Vector3();
const _quat = new Quaternion(), _tgt = new Quaternion(), _mat = new Matrix4(), _up = new Vector3(0, 1, 0);

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
    const arrived = useRef(true), turnDir = useRef(1), blocked = useRef(false);

    useFrame((_, dt) => {
        const rb = rigidBodyRef.current?.rigidBodyRef?.current;
        if (!rb || paused) return;

        const p = rb.translation();
        _pos.set(p.x, p.y, p.z);
        _dir.set(...position).sub(_pos).setY(0);

        if (_dir.length() < 0.5) {
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

        const rayOrigin = { x: p.x + _fwd.x * RAY_OFFSET, y: p.y + 0.8, z: p.z + _fwd.z * RAY_OFFSET };
        const ray = new rapier.Ray(rayOrigin, _fwd);
        blocked.current = world.castRay(ray, WHISKER, true, undefined, undefined, undefined, rb) !== null;

        let steerDir = _dir;
        if (blocked.current) {
            const cross = _fwd.clone().cross(_dir).y;
            if (Math.abs(cross) > 0.2) turnDir.current = cross > 0 ? 1 : -1;
            steerDir = _fwd.clone().applyAxisAngle(_up, turnDir.current * 0.8);
        }

        _mat.lookAt(_pos.clone().add(steerDir), _pos, _up);
        _tgt.setFromRotationMatrix(_mat);

        // Smoothing scales with angle - larger turns rotate faster
        const angleDiff = _quat.angleTo(_tgt);
        _quat.slerp(_tgt, 1 - Math.exp(-SMOOTHING * angleDiff * 60 * dt));

        const distance = _dir.set(...position).sub(_pos).setY(0).length();
        const shouldRun = distance > RUN_DISTANCE && !blocked.current;
        const baseSpeed = shouldRun ? RUN_SPEED : WALK_SPEED;
        _vel.set(0, 0, blocked.current ? baseSpeed * 0.5 : baseSpeed).applyQuaternion(_quat);
        rb.setRotation(_quat, true);
        rb.setLinvel({ x: _vel.x, y: rb.linvel().y, z: _vel.z }, true);
        setAnimation(shouldRun ? "run" : "walk");
    });

    const group = rigidBodyRef.current?.groupRef;
    return debug && !arrived.current && group ? <AimLine container={group} hit={blocked.current} length={WHISKER} offset={RAY_OFFSET} /> : null;
};

export default SteeringBehavior;