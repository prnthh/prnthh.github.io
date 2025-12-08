import { useRapier } from "@react-three/rapier";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";

export default function RagdollComponent({ modelPath = '/models/human/onimilio/rigged.glb' }) {
    const { world } = useRapier();
    const { scene } = useThree();
    const ragdoll = useRef<Ragdoll | null>(null);
    const gltf = useGLTF(modelPath);
    useEffect(() => {
        if (world && scene && gltf) {
            const clonedGltf = SkeletonUtils.clone(gltf.scene)
            ragdoll.current = new Ragdoll(world, scene, clonedGltf);
        }
        // Cleanup to ensure only one ragdoll exists
        return () => {
            if (ragdoll.current && ragdoll.current.mesh) {
                scene.remove(ragdoll.current.mesh);
                ragdoll.current = null;
            }
        };
    }, [world, scene, gltf]);

    useFrame((_, delta) => {
        if (ragdoll.current) {
            ragdoll.current.update(delta);
        }
    });

    return null;
}

import RAPIER, { World } from "@dimforge/rapier3d-compat";
import { Mesh, Object3D, Object3DEventMap, Quaternion, Scene, Vector3 } from "three";

type RagdollParts = 'head' | 'torso' | 'armUpperRight' | 'armLowerRight' | 'armUpperLeft' | 'armLowerLeft' | 'thighRight' | 'shinRight' | 'thighLeft' | 'shinLeft';

export class Ragdoll extends Object3D {
    world: World;
    head!: RAPIER.RigidBody;
    torso!: RAPIER.RigidBody;
    armUpperRight!: RAPIER.RigidBody;
    armLowerRight!: RAPIER.RigidBody;
    armUpperLeft!: RAPIER.RigidBody;
    armLowerLeft!: RAPIER.RigidBody;
    thighRight!: RAPIER.RigidBody;
    shinRight!: RAPIER.RigidBody;
    thighLeft!: RAPIER.RigidBody;
    shinLeft!: RAPIER.RigidBody;
    mesh: Object3D<Object3DEventMap> | null = null;

    paused: boolean = false;
    private static readonly boneMapping = {
        head: 'mixamorigHead',
        torso: 'mixamorigHips',
        armUpperLeft: 'mixamorigLeftArm',
        armUpperRight: 'mixamorigRightArm',
        armLowerLeft: 'mixamorigLeftForeArm',
        armLowerRight: 'mixamorigRightForeArm',
        thighLeft: 'mixamorigLeftUpLeg',
        thighRight: 'mixamorigRightUpLeg',
        shinLeft: 'mixamorigLeftLeg',
        shinRight: 'mixamorigRightLeg'
    };
    private initialBoneWorldQuaternions: Map<string, Quaternion> = new Map();

    constructor(world: World, scene: Scene, object: Object3D<Object3DEventMap>) {
        super();
        this.world = world;
        object.traverse(o => {
            if (o instanceof Mesh) {
                o.castShadow = true;
                o.receiveShadow = true;
                o.frustumCulled = false;
            }
        });
        this.mesh = object;
        this.mesh.position.set(0, 1, 0);
        this.mesh.rotation.set(Math.PI / 2, 0, 0);
        scene.add(this.mesh);
        for (const boneName of Object.values(Ragdoll.boneMapping)) {
            const bone = this.mesh.getObjectByName(boneName);
            if (bone) {
                const quat = new Quaternion();
                bone.getWorldQuaternion(quat);
                this.initialBoneWorldQuaternions.set(boneName, quat);
            }
        }
        this.createRagdoll();
        // Set all rigidbodies to disabled at start
        for (const key of Object.keys(Ragdoll.boneMapping)) {
            if (this[key as RagdollParts]) {
                // this[key as RagdollParts].setEnabled(false);
            }
        }
    }

    private createRigidBodyWithCollider(
        desc: RAPIER.ColliderDesc,
        bodyDesc: RAPIER.RigidBodyDesc
    ): RAPIER.RigidBody {
        const body = this.world.createRigidBody(bodyDesc);
        this.world.createCollider(desc, body);
        return body;
    }

    private createRagdollJoint(
        anchor1: RAPIER.Vector,
        anchor2: RAPIER.Vector,
        parent1: RAPIER.RigidBody,
        parent2: RAPIER.RigidBody,
        type: 'spherical' | 'revolute' = 'spherical',
        axis?: RAPIER.Vector
    ) {
        let joint;
        const maxAngle = Math.PI / 2;
        const defaultLimits = [-maxAngle, maxAngle];
        if (type === 'revolute' && axis) {
            joint = RAPIER.JointData.revolute(anchor1, anchor2, axis);
        } else {
            joint = RAPIER.JointData.spherical(anchor1, anchor2);
        }
        joint.limits = defaultLimits;
        this.world.createImpulseJoint(joint, parent1, parent2, true);
    }

    private createRagdoll() {
        if (!this.mesh) return;
        // Gather bone transforms
        const boneTransforms: Partial<Record<RagdollParts, { pos: Vector3, quat: Quaternion, scale: Vector3 }>> = {};
        for (const [key, boneName] of Object.entries(Ragdoll.boneMapping)) {
            const bone = this.mesh.getObjectByName(boneName);
            if (bone) {
                const pos = new Vector3();
                const quat = new Quaternion();
                const scale = new Vector3();
                bone.getWorldPosition(pos);
                bone.getWorldQuaternion(quat);
                bone.getWorldScale(scale);
                boneTransforms[key as RagdollParts] = { pos, quat, scale };
            }
        }
        // Helper to get transform (no fallback)
        const getTransform = (part: RagdollParts) => {
            if (!boneTransforms[part]) throw new Error(`Missing bone transform for ${part}`);
            return {
                pos: boneTransforms[part]!.pos.clone(),
                quat: boneTransforms[part]!.quat.clone(),
                scale: boneTransforms[part]!.scale.clone(),
            };
        };
        // Use bone distances for sizing (no fallback)
        const getBoneLength = (start: string, end: string): number => {
            const a = this.mesh!.getObjectByName(start);
            const b = this.mesh!.getObjectByName(end);
            if (a && b) {
                return a.getWorldPosition(new Vector3()).distanceTo(b.getWorldPosition(new Vector3()));
            }
            throw new Error(`Missing bone(s) for length: ${start}, ${end}`);
        };
        // Get transforms (no fallback)
        const torsoT = getTransform('torso');
        const headT = getTransform('head');
        const thighLeftT = getTransform('thighLeft');
        const thighRightT = getTransform('thighRight');
        // Sizing from bones (no fallback)
        const torsoHeight = torsoT.pos.distanceTo(headT.pos) * 0.6;
        const torsoWidth = thighLeftT.pos.distanceTo(thighRightT.pos);
        const headSize = torsoHeight * 0.5;
        const upperArmRightLength = getBoneLength('mixamorigRightArm', 'mixamorigRightForeArm');
        const lowerArmRightLength = getBoneLength('mixamorigRightForeArm', 'mixamorigRightHand');
        const upperArmLeftLength = getBoneLength('mixamorigLeftArm', 'mixamorigLeftForeArm');
        const lowerArmLeftLength = getBoneLength('mixamorigLeftForeArm', 'mixamorigLeftHand');
        const thighRightLength = getBoneLength('mixamorigRightUpLeg', 'mixamorigRightLeg');
        const shinRightLength = getBoneLength('mixamorigRightLeg', 'mixamorigRightFoot');
        const thighLeftLength = getBoneLength('mixamorigLeftUpLeg', 'mixamorigLeftLeg');
        const shinLeftLength = getBoneLength('mixamorigLeftLeg', 'mixamorigLeftFoot');
        // Directly compute segment sizes (no constants)
        const computedArmLength = Math.max(upperArmRightLength, upperArmLeftLength);
        const computedArmLowerLength = Math.max(lowerArmRightLength, lowerArmLeftLength);
        const computedLegSegmentHeight = Math.max(thighRightLength, thighLeftLength);
        const computedLegLowerSegmentHeight = Math.max(shinRightLength, shinLeftLength);
        const armThickness = computedArmLength * 0.25;
        const legThickness = computedLegSegmentHeight * 0.25;
        // Use bone positions for all parts (no fallback)
        const armUpperRightT = getTransform('armUpperRight');
        const armLowerRightT = getTransform('armLowerRight');
        const armUpperLeftT = getTransform('armUpperLeft');
        const armLowerLeftT = getTransform('armLowerLeft');
        const shinRightT = getTransform('shinRight');
        const shinLeftT = getTransform('shinLeft');

        // Modular creation of each body part
        // For arms, rotate collider 90 deg around Z to align X axis (bone) to Y axis (collider)
        const armAlignQuat = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
        this.torso = this.createRigidBodyWithCollider(
            RAPIER.ColliderDesc.cuboid(torsoWidth / 2, torsoHeight / 2, 0.1),
            RAPIER.RigidBodyDesc.dynamic().setTranslation(torsoT.pos.x, torsoT.pos.y, torsoT.pos.z).setRotation({ x: torsoT.quat.x, y: torsoT.quat.y, z: torsoT.quat.z, w: torsoT.quat.w })
        );
        this.head = this.createRigidBodyWithCollider(
            RAPIER.ColliderDesc.cuboid(headSize / 2, headSize / 2, headSize / 2),
            RAPIER.RigidBodyDesc.dynamic().setTranslation(headT.pos.x, headT.pos.y, headT.pos.z).setRotation({ x: headT.quat.x, y: headT.quat.y, z: headT.quat.z, w: headT.quat.w })
        );
        this.armUpperRight = this.createRigidBodyWithCollider(
            RAPIER.ColliderDesc.cuboid(computedArmLength / 2, armThickness / 2, armThickness / 2).setRotation({ x: armAlignQuat.x, y: armAlignQuat.y, z: armAlignQuat.z, w: armAlignQuat.w }),
            RAPIER.RigidBodyDesc.dynamic().setTranslation(armUpperRightT.pos.x, armUpperRightT.pos.y, armUpperRightT.pos.z).setRotation({ x: armUpperRightT.quat.x, y: armUpperRightT.quat.y, z: armUpperRightT.quat.z, w: armUpperRightT.quat.w })
        );
        this.armLowerRight = this.createRigidBodyWithCollider(
            RAPIER.ColliderDesc.cuboid(computedArmLowerLength / 2, armThickness / 2, armThickness / 2).setRotation({ x: armAlignQuat.x, y: armAlignQuat.y, z: armAlignQuat.z, w: armAlignQuat.w }),
            RAPIER.RigidBodyDesc.dynamic().setTranslation(armLowerRightT.pos.x, armLowerRightT.pos.y, armLowerRightT.pos.z).setRotation({ x: armLowerRightT.quat.x, y: armLowerRightT.quat.y, z: armLowerRightT.quat.z, w: armLowerRightT.quat.w })
        );
        this.armUpperLeft = this.createRigidBodyWithCollider(
            RAPIER.ColliderDesc.cuboid(computedArmLength / 2, armThickness / 2, armThickness / 2).setRotation({ x: armAlignQuat.x, y: armAlignQuat.y, z: armAlignQuat.z, w: armAlignQuat.w }),
            RAPIER.RigidBodyDesc.dynamic().setTranslation(armUpperLeftT.pos.x, armUpperLeftT.pos.y, armUpperLeftT.pos.z).setRotation({ x: armUpperLeftT.quat.x, y: armUpperLeftT.quat.y, z: armUpperLeftT.quat.z, w: armUpperLeftT.quat.w })
        );
        this.armLowerLeft = this.createRigidBodyWithCollider(
            RAPIER.ColliderDesc.cuboid(computedArmLowerLength / 2, armThickness / 2, armThickness / 2).setRotation({ x: armAlignQuat.x, y: armAlignQuat.y, z: armAlignQuat.z, w: armAlignQuat.w }),
            RAPIER.RigidBodyDesc.dynamic().setTranslation(armLowerLeftT.pos.x, armLowerLeftT.pos.y, armLowerLeftT.pos.z).setRotation({ x: armLowerLeftT.quat.x, y: armLowerLeftT.quat.y, z: armLowerLeftT.quat.z, w: armLowerLeftT.quat.w })
        );
        this.thighRight = this.createRigidBodyWithCollider(
            RAPIER.ColliderDesc.cuboid(legThickness / 2, computedLegSegmentHeight / 2, legThickness / 2),
            RAPIER.RigidBodyDesc.dynamic().setTranslation(thighRightT.pos.x, thighRightT.pos.y, thighRightT.pos.z).setRotation({ x: thighRightT.quat.x, y: thighRightT.quat.y, z: thighRightT.quat.z, w: thighRightT.quat.w })
        );
        this.shinRight = this.createRigidBodyWithCollider(
            RAPIER.ColliderDesc.cuboid(legThickness / 2, computedLegLowerSegmentHeight / 2, legThickness / 2),
            RAPIER.RigidBodyDesc.dynamic().setTranslation(shinRightT.pos.x, shinRightT.pos.y, shinRightT.pos.z).setRotation({ x: shinRightT.quat.x, y: shinRightT.quat.y, z: shinRightT.quat.z, w: shinRightT.quat.w })
        );
        this.thighLeft = this.createRigidBodyWithCollider(
            RAPIER.ColliderDesc.cuboid(legThickness / 2, computedLegSegmentHeight / 2, legThickness / 2),
            RAPIER.RigidBodyDesc.dynamic().setTranslation(thighLeftT.pos.x, thighLeftT.pos.y, thighLeftT.pos.z).setRotation({ x: thighLeftT.quat.x, y: thighLeftT.quat.y, z: thighLeftT.quat.z, w: thighLeftT.quat.w })
        );
        this.shinLeft = this.createRigidBodyWithCollider(
            RAPIER.ColliderDesc.cuboid(legThickness / 2, computedLegLowerSegmentHeight / 2, legThickness / 2),
            RAPIER.RigidBodyDesc.dynamic().setTranslation(shinLeftT.pos.x, shinLeftT.pos.y, shinLeftT.pos.z).setRotation({ x: shinLeftT.quat.x, y: shinLeftT.quat.y, z: shinLeftT.quat.z, w: shinLeftT.quat.w })
        );

        // Modular creation of joints
        const stiffness = 0.05;
        this.createRagdollJoint(
            { x: 0, y: -headSize / 2 - stiffness, z: 0 },
            { x: 0, y: torsoHeight / 2, z: 0 },
            this.head, this.torso, 'spherical'
        );
        // SWAP LEFT/RIGHT ARM JOINTS
        this.createRagdollJoint(
            { x: (torsoWidth / 2) + stiffness, y: 0.1, z: 0 }, // was right, now left
            { x: -computedArmLength / 2, y: 0, z: 0 },
            this.torso, this.armUpperRight, 'spherical'
        );
        this.createRagdollJoint(
            { x: -(torsoWidth / 2) - stiffness, y: 0.1, z: 0 }, // was left, now right
            { x: computedArmLength / 2, y: 0, z: 0 },
            this.torso, this.armUpperLeft, 'spherical'
        );
        // SWAP LOWER ARM JOINTS
        this.createRagdollJoint(
            { x: (computedArmLength / 2) + stiffness, y: 0, z: 0.0 }, // was right, now left
            { x: -computedArmLength / 2, y: 0, z: 0 },
            this.armUpperRight, this.armLowerRight, 'spherical'
        );
        this.createRagdollJoint(
            { x: -(computedArmLength / 2) - stiffness, y: 0, z: 0.0 }, // was left, now right
            { x: computedArmLength / 2, y: 0, z: 0 },
            this.armUpperLeft, this.armLowerLeft, 'spherical'
        );
        this.createRagdollJoint(
            { x: (torsoWidth / 2) - legThickness / 2, y: -torsoHeight / 2 - stiffness, z: 0 },
            { x: 0, y: -computedLegSegmentHeight / 2, z: 0 },
            this.torso, this.thighLeft, 'spherical'
        );
        this.createRagdollJoint(
            { x: -(torsoWidth / 2) + legThickness / 2, y: -torsoHeight / 2 - stiffness, z: 0 },
            { x: 0, y: -computedLegSegmentHeight / 2, z: 0 },
            this.torso, this.thighRight, 'spherical'
        );
        this.createRagdollJoint(
            { x: 0, y: computedLegSegmentHeight / 2 + stiffness, z: 0 },
            { x: 0, y: -computedLegSegmentHeight / 2, z: 0 },
            this.thighRight, this.shinRight, 'spherical'
        );
        this.createRagdollJoint(
            { x: 0, y: computedLegSegmentHeight / 2 + stiffness, z: 0 },
            { x: 0, y: -computedLegSegmentHeight / 2, z: 0 },
            this.thighLeft, this.shinLeft, 'spherical'
        );

        for (const key of Object.keys(Ragdoll.boneMapping)) {
            this[key as RagdollParts].setEnabled(!this.paused);
        }
    }

    public update(_delta: number) {
        if (!this.mesh) return;
        this.updateRagdoll();
    }

    updateRagdoll() {
        if (!this.mesh) return;
        for (const [key, boneName] of Object.entries(Ragdoll.boneMapping)) {
            const bone = this.mesh.getObjectByName(boneName);
            const body = this[key as RagdollParts];
            if (bone && body) {
                const translation = body.translation();
                const rotation = body.rotation();
                const bodyPos = new Vector3(translation.x, translation.y, translation.z);
                const parent = bone.parent as Object3D;
                if (parent) {
                    parent.worldToLocal(bodyPos);
                    bone.position.copy(bodyPos);
                    const bodyQuat = new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
                    const parentQuat = new Quaternion();
                    parent.getWorldQuaternion(parentQuat);
                    bone.quaternion.copy(parentQuat.clone().invert().multiply(bodyQuat));
                    bone.updateMatrix();
                }
            }
        }
    }
}