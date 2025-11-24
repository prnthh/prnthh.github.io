import { TextureListViewer } from '../../assetviewer/page';
import { useEffect, useState } from 'react';

export default function MaterialComponentEditor({ component, onUpdate }: { component: any; onUpdate: (newComp: any) => void }) {
    const [textureFiles, setTextureFiles] = useState<string[]>([]);

    useEffect(() => {
        fetch('/textures/manifest.json')
            .then(r => r.json())
            .then(data => setTextureFiles(Array.isArray(data) ? data : data.files || []))
            .catch(console.error);
    }, []);

    return (
        <div className="flex flex-col">
            <div className="mb-1">
                <label className="block text-[9px] text-cyan-400/60 uppercase tracking-wider mb-0.5">Color</label>
                <div className="flex gap-0.5">
                    <input
                        type="color"
                        className="h-5 w-5 bg-transparent border-none cursor-pointer"
                        value={component.properties.color}
                        onChange={e => onUpdate({ 'color': e.target.value })}
                    />
                    <input
                        type="text"
                        className="flex-1 bg-black/40 border border-cyan-500/30 px-1 py-0.5 text-[10px] text-cyan-300 font-mono focus:outline-none focus:border-cyan-400/50"
                        value={component.properties.color}
                        onChange={e => onUpdate({ 'color': e.target.value })}
                    />
                </div>
            </div>
            <div className="flex items-center gap-1 mb-1">
                <input
                    type="checkbox"
                    className="w-3 h-3"
                    checked={component.properties.wireframe || false}
                    onChange={e => onUpdate({ 'wireframe': e.target.checked })}
                />
                <label className="text-[9px] text-cyan-400/60">Wireframe</label>
            </div>

            <div>
                <label className="block text-[9px] text-cyan-400/60 uppercase tracking-wider mb-0.5">Texture</label>
                <div className="max-h-32 overflow-y-auto">
                    <TextureListViewer
                        files={textureFiles}
                        selected={component.properties.texture || undefined}
                        onSelect={(file) => onUpdate({ 'texture': file })}
                    />
                </div>
            </div>

            {component.properties.texture && (
                <div className="border-t border-cyan-500/20 pt-1 mt-1">
                    <div className="flex items-center gap-1 mb-1">
                        <input
                            type="checkbox"
                            className="w-3 h-3"
                            checked={component.properties.repeat || false}
                            onChange={e => onUpdate({ 'repeat': e.target.checked })}
                        />
                        <label className="text-[9px] text-cyan-400/60">Repeat Texture</label>
                    </div>

                    {component.properties.repeat && (
                        <div>
                            <label className="block text-[9px] text-cyan-400/60 uppercase tracking-wider mb-0.5">Repeat (X, Y)</label>
                            <div className="flex gap-0.5">
                                <input
                                    type="number"
                                    className="w-full bg-black/40 border border-cyan-500/30 px-1 py-0.5 text-[10px] text-cyan-300 font-mono focus:outline-none focus:border-cyan-400/50"
                                    value={component.properties.repeatCount?.[0] ?? 1}
                                    onChange={e => {
                                        const y = component.properties.repeatCount?.[1] ?? 1;
                                        onUpdate({ 'repeatCount': [parseFloat(e.target.value), y] });
                                    }}
                                />
                                <input
                                    type="number"
                                    className="w-full bg-black/40 border border-cyan-500/30 px-1 py-0.5 text-[10px] text-cyan-300 font-mono focus:outline-none focus:border-cyan-400/50"
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
    );
};
