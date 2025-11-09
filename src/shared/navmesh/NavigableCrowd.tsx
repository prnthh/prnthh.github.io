import { useFrame, useThree } from "@react-three/fiber";
import { CrowdHelper } from "@recast-navigation/three";
import { useEffect, useRef, useState } from "react";
import { Crowd, CrowdAgent, NavMesh, NavMeshQuery } from 'recast-navigation';
import * as THREE from "three";

const NavigableCrowd = ({ navMeshRef }: { navMeshRef: React.RefObject<NavMesh> }) => {
    const { scene } = useThree();
    const crowdRef = useRef<Crowd | null>(null);
    const crowdHelperRef = useRef<CrowdHelper | null>(null);
    const agentsRef = useRef<CrowdAgent[]>([]);
    const navMeshQueryRef = useRef<NavMeshQuery | null>(null);

    const addAgent = (position: { x: number; y: number; z: number }) => {
        if (!crowdRef.current || !navMeshQueryRef.current) return;

        const crowd = crowdRef.current;
        const navMeshQuery = navMeshQueryRef.current;
        const maxAgentRadius = 0.6;

        const { point: agentPosition } = navMeshQuery.findClosestPoint(position);

        const agent = crowd.addAgent(agentPosition, {
            radius: 0.5,
            height: 2.0,
            maxAcceleration: 4.0,
            maxSpeed: 4.0,
            collisionQueryRange: maxAgentRadius * 2,
            pathOptimizationRange: 0.0,
        });

        agentsRef.current.push(agent);
        crowdHelperRef.current?.update();

        return agent;
    };

    const setTarget = (position: { x: number; y: number; z: number }) => {
        if (!navMeshQueryRef.current || !crowdRef.current) return;

        const { nearestPoint: target } = navMeshQueryRef.current.findNearestPoly(position);

        // Move all agents to the target
        agentsRef.current.forEach(agent => {
            agent.requestMoveTarget(target);
        });
    };

    const setRandomTarget = () => {
        setTarget({
            x: (Math.random() - 0.5) * 50,
            y: 0,
            z: (Math.random() - 0.5) * 50,
        });
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setRandomTarget();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!navMeshRef.current) return;

        const navMesh = navMeshRef.current;
        const maxAgents = 10;
        const maxAgentRadius = 0.6;
        const agentMaterial = new THREE.MeshBasicMaterial({ color: 'red' });

        const crowd = new Crowd(navMesh, { maxAgents, maxAgentRadius });
        crowdRef.current = crowd;

        const crowdHelper = new CrowdHelper(crowd, {
            agentMaterial,
        });
        crowdHelperRef.current = crowdHelper;

        scene.add(crowdHelper);

        // Create a NavMeshQuery to find valid positions
        const navMeshQuery = new NavMeshQuery(navMesh);
        navMeshQueryRef.current = navMeshQuery;

        // Add some agents at random positions
        for (let i = 0; i < 5; i++) {
            addAgent({
                x: (Math.random() - 0.5) * 20,
                y: 0,
                z: (Math.random() - 0.5) * 20,
            });
        }

        // update the helper after adding agents
        crowdHelper.update();

        return () => {
            scene.remove(crowdHelper);
            navMeshQueryRef.current?.destroy();
            crowdRef.current = null;
            crowdHelperRef.current = null;
            navMeshQueryRef.current = null;
            agentsRef.current = [];
        };
    }, [navMeshRef.current, scene]);

    useFrame((state, delta) => {
        const clampedDelta = Math.min(delta, 0.1);
        crowdRef.current?.update(clampedDelta);
        crowdHelperRef.current?.update();
    });

    return null;
}



export default NavigableCrowd;