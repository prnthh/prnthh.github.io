export default function MaterialComponentEditor({ component, onUpdate }: { component: any; onUpdate: (newComp: any) => void }) {

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
        <div className="flex items-center gap-2">
            <input
                type="checkbox"
                checked={component.properties.wireframe || false}
                onChange={e => onUpdate({ 'wireframe': e.target.checked })}
            />
            <label className="text-xs text-gray-400">Wireframe</label>
        </div>

        <div>
            <label className="block text-xs text-gray-400 mb-1">Texture</label>
            <input
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                value={component.properties.texture || ''}
                onChange={e => onUpdate({ 'texture': e.target.value })}
                placeholder="Texture filename"
            />
        </div>

        {component.properties.texture && (
            <div className="border-t border-gray-600 pt-2 mt-1">
                <div className="flex items-center gap-2 mb-2">
                    <input
                        type="checkbox"
                        checked={component.properties.repeat || false}
                        onChange={e => onUpdate({ 'repeat': e.target.checked })}
                    />
                    <label className="text-xs text-gray-400">Repeat Texture</label>
                </div>

                {component.properties.repeat && (
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Repeat Count (X, Y)</label>
                        <div className="flex gap-1">
                            <input
                                type="number"
                                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                                value={component.properties.repeatCount?.[0] ?? 1}
                                onChange={e => {
                                    const y = component.properties.repeatCount?.[1] ?? 1;
                                    onUpdate({ 'repeatCount': [parseFloat(e.target.value), y] });
                                }}
                            />
                            <input
                                type="number"
                                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                                value={component.properties.repeatCount?.[1] ?? 1}
                                onChange={e => {
                                    const x = component.properties.repeatCount?.[0] ?? 1;
                                    onUpdate({ 'repeatCount': [x, parseFloat(e.target.value)] });
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        )}
    </div>
};
