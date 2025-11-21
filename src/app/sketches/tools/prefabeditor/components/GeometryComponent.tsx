export default function GeometryComponentEditor({ component, onUpdate }: { component: any; onUpdate: (newComp: any) => void }) {

    return <div>
        <label className="block text-xs text-gray-400 mb-1">Type</label>
        <select
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
            value={component.properties.geometryType}
            onChange={e => onUpdate({ geometryType: e.target.value })}
        >
            <option value="box">Box</option>
            <option value="sphere">Sphere</option>
            <option value="plane">Plane</option>
        </select>
    </div>;
};
