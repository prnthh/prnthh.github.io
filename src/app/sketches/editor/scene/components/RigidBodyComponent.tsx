import { RigidBody } from "@react-three/rapier";
import React from "react";

export type RigidBodyComponentData = {
    type: "fixed" | "dynamic" | "kinematicPosition" | "kinematicVelocity";
};

export const RigidBodyComponentDefault: RigidBodyComponentData = {
    type: "dynamic",
};

export function RigidBodyComponentRow({ data, onChange, onDelete }: {
    data: RigidBodyComponentData;
    onChange: (data: RigidBodyComponentData) => void;
    onDelete: () => void;
}) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ minWidth: 80 }}>RigidBody</span>
            <select
                value={data.type}
                onChange={e => onChange({ ...data, type: e.target.value as RigidBodyComponentData["type"] })}
            >
                <option value="dynamic">dynamic</option>
                <option value="fixed">fixed</option>
                <option value="kinematicPosition">kinematicPosition</option>
                <option value="kinematicVelocity">kinematicVelocity</option>
            </select>
            <button onClick={onDelete} style={{ color: "#f44", marginLeft: 8 }}>Delete</button>
        </div>
    );
}

export function withRigidBody(node: React.ReactNode, data: RigidBodyComponentData) {
    return <RigidBody type={data.type}>{node}</RigidBody>;
}
