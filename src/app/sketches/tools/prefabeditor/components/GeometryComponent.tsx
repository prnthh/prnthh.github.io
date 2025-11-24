export default function GeometryComponentEditor({ component, onUpdate }: { component: any; onUpdate: (newComp: any) => void }) {

    return <div>
        <label className="block text-[9px] text-cyan-400/60 uppercase tracking-wider mb-0.5">Type</label>
        <select
            className="w-full bg-black/40 border border-cyan-500/30 px-1 py-0.5 text-[10px] text-cyan-300 font-mono focus:outline-none focus:border-cyan-400/50"
            value={component.properties.geometryType}
            onChange={e => onUpdate({ geometryType: e.target.value })}
        >
            <option value="box">Box</option>
            <option value="sphere">Sphere</option>
            <option value="plane">Plane</option>
        </select>
    </div>;
};
