export default function PhysicsComponentEditor({ component, onUpdate }: { component: any; onUpdate: (newComp: any) => void }) {

    return <div>
        <label className="block text-xs text-gray-400 mb-1">Type</label>
        <select
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
            value={component.properties.type}
            onChange={e => onUpdate({ type: e.target.value })}
        >
            <option value="dynamic">Dynamic</option>
            <option value="fixed">Fixed</option>
        </select>
    </div>
        ;
}