"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Shebang from "@/shared/ui/shebang";

type ItemConfig = {
    name?: string;
    description?: string;
    external?: boolean;
    path?: string;
};

const demosConfig: Record<string, ItemConfig> = {
    'museum': {
        path: 'demos/zoo',
        description: 'Asset showcase (models/vfx/assets)'
    },
    'scumm-physics': {
        path: 'demos/scumm',
        description: 'A simple point-and-click adventure game demo inspired by classic SCUMM games.'
    },
    'scumm-nav': {
        path: 'demos/scumm2',
        description: 'NavAgent version of SCUMM game demo.'
    },
    'car': {
        path: 'sketches/car',
        description: 'Simple car physics demo.'
    },
    'ik/ragdoll': {
        path: 'sketches/ik/ragdoll',
        description: 'Physics-based ragdoll with inverse kinematics.'
    },
    'ik/crawler': {
        path: 'sketches/ik/crawler',
        description: 'Procedural animation crawler.'
    },
    'instancing/simple': {
        path: 'sketches/instancing/simple',
        description: 'Basic GPU instancing.'
    },
    'instancing/merged': {
        path: 'sketches/instancing/merged',
        description: 'Merged geometry instancing.'
    },
    'instancing/InstanceProvider': {
        path: 'sketches/instancing/InstanceProvider',
        description: 'Instance provider pattern demo.'
    },
    'instancing/crowd': {
        path: 'sketches/instancing/crowd',
        description: 'Large crowd simulation.'
    },
    'instancing/npc4': {
        path: 'sketches/instancing/npc4',
        description: 'NPC crowd with behaviors.'
    },
    'floor': {
        path: 'sketches/floor',
        description: 'A variety of floor shaders and techniques for realistic and stylized surfaces.'
    },
    'particles': {
        path: 'sketches/particles',
        description: 'Particle system experiments.'
    },
    'voxelcode': {
        path: 'sketches/replicube',
        description: 'Replicube style voxel system experiments.'
    },
    'wfc': {
        path: '../wfc/index.html',
        description: 'Wave function collapse algorithm.'
    },
    'chainreaction': {
        path: '../chainreaction.html',
        description: 'Chain reaction game.'
    }
};

const toolsConfig: Record<string, ItemConfig> = {
    'react-three-controller/combined': {
        path: 'react-three-controller/combined',
        description: 'Combined character controller package.'
    },
    'react-three-controller/navmesh': {
        path: 'react-three-controller/navmesh',
        description: 'First-person controller component.'
    },
    'react-three-controller/raycastped': {
        path: 'react-three-controller/ped',
        description: 'First-person controller component.'
    },
    'react-three-terrain/editor': {
        path: 'react-three-terrain/editor',
        description: 'Interactive terrain editor.'
    },
    'react-three-terrain/viewer': {
        path: 'react-three-terrain/viewer',
        description: 'Terrain viewer component.'
    },
    'react-three-game': {
        path: 'react-three-game',
        external: true,
        description: 'React Three Fiber game framework.'
    },
    'character': {
        path: 'tools/character',
        description: 'Character editor tool.'
    },
    'picocad': {
        path: 'tools/picocad',
        description: 'Picocad model exporter.'
    },
    'prefabeditor': {
        path: 'tools/prefabeditor',
        description: 'Prefab editor tool.'
    },
    'eth-pcp': {
        path: 'Pockit-Challenge-Protocol',
        external: true,
        description: 'EVM Pockit Challenge Protocol implementation.'
    },
};

// Helper to build a tree from the flat list
function buildTree(paths: string[]) {
    const tree: any = {};
    for (const path of paths) {
        const parts = path.split("/");
        let node = tree;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!node[part]) node[part] = i === parts.length - 1 ? null : {};
            node = node[part] || {};
        }
    }
    return tree;
}

const demosTree = buildTree(Object.keys(demosConfig));
const toolsTree = buildTree(Object.keys(toolsConfig));

function DemoTree({ node, prefix = "", search = "", currentPath = "", config }: { node: any; prefix?: string; search?: string; currentPath?: string; config: Record<string, ItemConfig> }) {
    const [open, setOpen] = useState<{ [k: string]: boolean }>({});
    // Filter nodes by search
    const entries = Object.entries(node).filter(([key, value]) => {
        if (!search) return true;
        // Leaf nodes: either null or string
        if (value === null || typeof value === 'string') {
            return key.toLowerCase().includes(search.toLowerCase());
        } else {
            // Show folders if any child matches
            const hasMatch = (n: any): boolean => {
                return Object.entries(n).some(([k, v]) => {
                    if (v === null || typeof v === 'string') {
                        return k.toLowerCase().includes(search.toLowerCase());
                    }
                    return hasMatch(v);
                });
            };
            return hasMatch(value) || key.toLowerCase().includes(search.toLowerCase());
        }
    });
    return (
        <div className="flex flex-col">
            {entries.map(([key, value]) => {
                if (typeof value === "string" || value === null) {
                    // Leaf node
                    const displayName = key;
                    const lookupKey = typeof value === "string" ? value : prefix + key;
                    const itemConfig = config[lookupKey];
                    const fullPath = itemConfig?.path || lookupKey;
                    const normalize = (p: string) => p.replace(/[?#].*$/, '').replace(/\/$/, '');
                    const isActive = normalize(currentPath || '') === `/${normalize(fullPath)}`;
                    const isExternal = itemConfig?.external;

                    return isExternal ? (
                        <a
                            href={`/${fullPath}`}
                            key={fullPath}
                            className={`px-3 py-1.5 my-px transition-all select-none border-l-2
                                ${isActive ? "font-semibold bg-neutral-600/40 border-neutral-400 text-white" : "bg-neutral-700/50 border-neutral-600 hover:bg-neutral-600/50 hover:border-neutral-400 cursor-pointer text-neutral-200"}`}
                        >
                            <span className="font-semibold uppercase text-sm tracking-wider">{displayName}</span>
                            <br />
                            <span className="text-xs text-neutral-400">
                                {itemConfig?.description}
                            </span>
                        </a>
                    ) : (
                        <Link
                            href={`/${fullPath}`}
                            prefetch={false}
                            key={fullPath}
                            className={`px-3 py-1.5 my-px transition-all select-none border-l-2
                                ${isActive ? "font-bold bg-neutral-600/40 border-neutral-400 text-white" : "bg-neutral-700/50 border-neutral-600 hover:bg-neutral-600/50 hover:border-neutral-400 cursor-pointer text-neutral-200"}`}
                        >
                            <span className="font-semibold uppercase text-sm tracking-wider">{displayName}</span>
                            <br />
                            <span className="text-xs text-neutral-400">
                                {itemConfig?.description}
                            </span>
                        </Link>
                    );
                } else {
                    // Category node
                    const isOpen = open[key] || false;
                    return (
                        <div key={prefix + key}>
                            <div
                                className={`flex items-center px-2 py-1 select-none cursor-pointer transition-colors text-xs uppercase tracking-widest text-neutral-500 hover:text-neutral-300`}
                                onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}
                                tabIndex={0}
                                role="button"
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen((o) => ({ ...o, [key]: !o[key] })); }}
                            >
                                <span className="mr-1">{isOpen ? "−" : "+"}</span>
                                {key}
                            </div>
                            {isOpen && <div className="ml-3 border-l border-neutral-700 pl-1"><DemoTree node={value} prefix={prefix + key + "/"} search={search} currentPath={currentPath} config={config} /></div>}
                        </div>
                    );
                }
            })}
        </div>
    );
}

export default function Nav() {
    const [clicked, setClicked] = useState(false);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<'demos' | 'tools'>('demos');
    const pathname = usePathname();

    return (
        <div>
            <div className={`text-neutral-200 fixed top-3 left-3 z-40 ${clicked ? 'w-[280px]' : 'w-8'} ${clicked ? 'h-[calc(100vh-80px)]' : 'h-8'} transition-all`}>
                <div className={`${clicked ? 'w-[280px]' : 'w-[42px]'} bg-neutral-800/90 backdrop-blur-sm fixed top-[12px] left-[12px] hover:bg-neutral-800 border border-neutral-700 flex overflow-hidden transition-all`}
                    onClick={() => setClicked(() => true)}
                >
                    <button
                        aria-label={clicked ? 'Close menu' : 'Open menu'}
                        onClick={(e) => { setClicked(o => !o); e.stopPropagation(); }}
                    >
                        <span className="block w-10 h-10">
                            <Shebang />
                        </span>
                    </button>
                    <input
                        className="bg-transparent focus:outline-none px-2 py-1 border-none placeholder-neutral-500 text-neutral-200 flex-grow text-sm"
                        type="text"
                        placeholder={`SEARCH ${activeTab.toUpperCase()}...`}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                {clicked && <div className={`${clicked ? 'overflow-y-scroll border border-neutral-700 h-full opacity-100 backdrop-blur-sm' : 'opacity-0'} bg-neutral-800/90 px-2 noscrollbar select-none flex flex-col mt-12 transition-all`}>
                    {/* Tab buttons */}
                    <div className="flex gap-px my-2 z-10 bg-neutral-900/50">
                        <button
                            onClick={() => setActiveTab('demos')}
                            className={`flex-1 px-3 py-1.5 text-xs uppercase tracking-widest font-semibold transition-all ${activeTab === 'demos'
                                ? 'bg-neutral-700 text-white border-b-2 border-neutral-400'
                                : 'hover:bg-neutral-700/50 text-neutral-500'
                                }`}
                        >
                            demos
                        </button>
                        <button
                            onClick={() => setActiveTab('tools')}
                            className={`flex-1 px-3 py-1.5 text-xs uppercase tracking-widest font-semibold transition-all ${activeTab === 'tools'
                                ? 'bg-neutral-700 text-white border-b-2 border-neutral-400'
                                : 'hover:bg-neutral-700/50 text-neutral-500'
                                }`}
                        >
                            tools
                        </button>
                    </div>

                    {/* Content */}
                    {clicked && activeTab === 'demos' && (
                        <DemoTree node={demosTree} search={search} currentPath={pathname} config={demosConfig} />
                    )}
                    {clicked && activeTab === 'tools' && (
                        <DemoTree node={toolsTree} search={search} currentPath={pathname} config={toolsConfig} />
                    )}
                </div>}
            </div>
        </div>
    );
}
