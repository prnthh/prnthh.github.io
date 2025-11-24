import { Vector3Input } from "../EditorUI";

export default function TransformComponentEditor({ component, onUpdate }: { component: any; onUpdate: (newComp: any) => void }) {

    return <div className="flex flex-col">
        <Vector3Input label="Position" value={component.properties.position} onChange={v => onUpdate({ position: v })} />
        <Vector3Input label="Rotation" value={component.properties.rotation} onChange={v => onUpdate({ rotation: v })} />
        <Vector3Input label="Scale" value={component.properties.scale} onChange={v => onUpdate({ scale: v })} />
    </div>;
}