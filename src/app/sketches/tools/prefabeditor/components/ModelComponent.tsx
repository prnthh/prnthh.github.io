import { ModelListViewer } from '../../assetviewer/page';
import { useEffect, useState } from 'react';

export default function ModelComponentEditor({ component, onUpdate }: { component: any; onUpdate: (newComp: any) => void }) {
    const [modelFiles, setModelFiles] = useState<string[]>([]);

    useEffect(() => {
        fetch('/models/manifest.json')
            .then(r => r.json())
            .then(data => setModelFiles(Array.isArray(data) ? data : data.files || []))
            .catch(console.error);
    }, []);

    const handleModelSelect = (file: string) => {
        // Remove leading slash for prefab compatibility
        const filename = file.startsWith('/') ? file.slice(1) : file;
        onUpdate({ 'filename': filename });
    };

    return <div>
        <div className="mb-1">
            <label className="block text-[9px] text-cyan-400/60 uppercase tracking-wider mb-0.5">Model</label>
            <div className="max-h-32 overflow-y-auto">
                <ModelListViewer
                    files={modelFiles}
                    selected={component.properties.filename ? `/${component.properties.filename}` : undefined}
                    onSelect={handleModelSelect}
                />
            </div>
        </div>
        <div className="flex items-center gap-1">
            <input
                type="checkbox"
                id="instanced-checkbox"
                checked={component.properties.instanced || false}
                onChange={e => onUpdate({ 'instanced': e.target.checked })}
                className="w-3 h-3"
            />
            <label htmlFor="instanced-checkbox" className="text-[9px] text-cyan-400/60">Instanced</label>
        </div>
    </div>;
}