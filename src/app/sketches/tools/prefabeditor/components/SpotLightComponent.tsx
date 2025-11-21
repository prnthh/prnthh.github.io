export default function SpotLightComponentEditor({ component, onUpdate }: { component: any; onUpdate: (newComp: any) => void }) {

    return <div className="flex flex-col gap-2">
        <div>
            <label className="block text-xs text-gray-400 mb-1">Color</label>
            <div className="flex gap-2">
                <input
                    type="color"
                    className="h-8 w-8 bg-transparent border-none cursor-pointer"
                    value={component.properties.color}
                    onChange={e => onUpdate({ 'color': e.target.value })}
                />
                <input
                    type="text"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                    value={component.properties.color}
                    onChange={e => onUpdate({ 'color': e.target.value })}
                />
            </div>
        </div>
        <div>
            <label className="block text-xs text-gray-400 mb-1">Intensity</label>
            <input
                type="number"
                step="0.1"
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                value={component.properties.intensity}
                onChange={e => onUpdate({ 'intensity': parseFloat(e.target.value) })}
            />
        </div>
    </div>;
}