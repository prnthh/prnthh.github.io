import { Object3DComponent, OrbitComponent, System } from "../ecs";
import * as THREE from "three";

// Orbit System: updates entities with OrbitComponent
const orbitSystem: System = (entities, delta) => {
    entities.forEach((entity, id) => {
        const orbit = entity.components.get("OrbitComponent") as OrbitComponent | undefined;
        if (orbit) {
            orbit.angle += orbit.speed * delta;
            const parent = orbit.parentId !== null ? entities.get(orbit.parentId) : null;
            const parentObj = parent?.components.get("Object3D") as Object3DComponent | undefined;
            const parentPos = parentObj ? parentObj.object3D.position : new THREE.Vector3(0, 0, 0);
            const x = parentPos.x + orbit.radius * Math.cos(orbit.angle);
            const z = parentPos.z + orbit.radius * Math.sin(orbit.angle);
            const obj3d = entity.components.get("Object3D") as Object3DComponent;
            obj3d.object3D.position.set(x, parentPos.y, z);
        }
    });
};

export default orbitSystem;
