import { PedPropsType } from "@/app/sketches/controllers/click/ped/ped";
import { ECSStoreType, System } from "../ecs";
import useECSStore from "../EditorContext";

// --- Wander System ---
const wanderSystem: System = (entities, delta) => {
    // Only one ped for now (id: 10)
    const pedEntity = Array.from(entities.values()).find(e => e.components.has("Ped"));
    if (!pedEntity) return;
    const ped = pedEntity.components.get("Ped") as PedPropsType & { wanderNodes?: [number, number, number][] };
    if (!ped.wanderNodes || ped.wanderNodes.length === 0) return;
    let timer = pedEntity.components.get("_wanderTimer");
    if (!timer) {
        timer = { t: 0 };
        pedEntity.components.set("_wanderTimer", timer);
    }
    timer.t = (timer.t || 0) + delta;
    if (timer.t > 6) {
        // Pick a new random node
        const idx = Math.floor(Math.random() * ped.wanderNodes.length);
        const newPos = ped.wanderNodes[idx];
        // Use ECS store to update the Ped component's position
        const { updateComponent } = useECSStore.getState() as ECSStoreType;
        updateComponent(pedEntity.id, "Ped", { position: newPos });
        timer.t = 0;
    }
};

export default wanderSystem;