export default function ModelComponentEditor({ component, onUpdate }: { component: any; onUpdate: (newComp: any) => void }) {

    return <div className="space-y-3">
        <div>
            <label className="block text-xs text-gray-400 mb-1">Filename</label>
            <input
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                value={component.properties.filename}
                onChange={e => onUpdate({ ...component.properties, filename: e.target.value })}
            />
        </div>
        <div className="flex items-center gap-2">
            <input
                type="checkbox"
                id="instanced-checkbox"
                checked={component.properties.instanced || false}
                onChange={e => onUpdate({ ...component.properties, instanced: e.target.checked })}
                className="w-4 h-4"
            />
            <label htmlFor="instanced-checkbox" className="text-xs text-gray-400">Instanced</label>
        </div>
    </div>;
}