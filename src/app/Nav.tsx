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
    'mechanics': {
        path: 'demos/mechanics',
        description: 'Basic game mechanics with a third-person character controller.'
    },
    'killbox': {
        path: 'demos/killbox',
        description: 'First-person multiplayer shooting gallery with physics-based ragdolls.'
    },
    'colony': {
        path: 'demos/colony',
        description: 'A top-down world with autonomous NPCs and basic AI behaviors.'
    },
    'runner': {
        path: 'demos/runner',
        description: 'Endless runner game demo with procedural level generation.'
    },
    'scumm': {
        path: 'demos/scumm',
        description: 'A simple point-and-click adventure game demo inspired by classic SCUMM games.'
    },
    'floor': {
        path: 'sketches/floor',
        description: 'A variety of floor shaders and techniques for realistic and stylized surfaces.'
    },
    'lighting': {
        path: 'sketches/lighting',
        description: 'Lighting and reflections.'
    },
    'car/simple': {
        path: 'sketches/car/simple',
        description: 'Simple car physics demo.'
    },
    'car/road': {
        path: 'sketches/car/road',
        description: 'Car driving on procedural roads.'
    },
    'navmesh/raycast': {
        path: 'sketches/navmesh/raycast',
        description: 'Raycast-based navigation.'
    },
    'navmesh/navmesh': {
        path: 'sketches/navmesh/navmesh',
        description: 'Navmesh pathfinding demo.'
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
    'retargeting/basic': {
        path: 'sketches/retargeting/basic',
        description: 'Basic animation retargeting.'
    },
    'retargeting/variety': {
        path: 'sketches/retargeting/variety',
        description: 'Multiple character retargeting.'
    },
    'particles': {
        path: 'sketches/particles',
        description: 'Particle system experiments.'
    },
    'ecs-world': {
        path: 'sketches/ecs-world',
        description: 'Entity-component-system world.'
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
    'react-three-controller/firstperson': {
        path: 'react-three-controller/firstperson',
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
    'pockit-challenge': {
        path: 'Pockit-Challenge-Protocol',
        external: true,
        description: 'Pockit challenge protocol implementation.'
    },
    'prefabeditor': {
        path: 'sketches/tools/prefabeditor',
        description: 'Prefab editor tool.'
    },
    'assetviewer': {
        path: 'sketches/tools/assetviewer',
        description: 'Asset viewer and inspector.'
    },
    'character': {
        path: 'sketches/tools/character',
        description: 'Character editor tool.'
    },
    'dragdrop': {
        path: 'sketches/tools/dragdrop',
        description: 'Drag and drop scene builder.'
    }
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
                            className={`rounded px-2 py-1 transition-colors select-none
                                ${isActive ? "font-bold dark:bg-white/10 bg-black/10 ring" : "hover:ring cursor-pointer"}`}
                        >
                            {displayName} <br />
                            <span className="text-sm font-light">
                                {itemConfig?.description}
                            </span>
                        </a>
                    ) : (
                        <Link
                            href={`/${fullPath}`}
                            prefetch={false}
                            key={fullPath}
                            className={`rounded px-2 py-1 transition-colors select-none
                                ${isActive ? "font-bold dark:bg-white/10 bg-black/10 ring" : "hover:ring cursor-pointer"}`}
                        >
                            {displayName} <br />
                            <span className="text-sm font-light">
                                {itemConfig?.description}
                            </span>
                        </Link>
                    );
                } else {
                    // Category node
                    const isOpen = open[key] || false;
                    return (
                        <div key={prefix + key} className="mb-1">
                            <div
                                className={`border flex items-center rounded px-2 py-1 select-none cursor-pointer transition-colors bg-white/20  ${isOpen ? "opacity-80" : "hover:opacity-70"}`}
                                onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}
                                tabIndex={0}
                                role="button"
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen((o) => ({ ...o, [key]: !o[key] })); }}
                            >
                                <span className="mr-1">{isOpen ? "▼" : "▶"}</span>
                                {key}
                            </div>
                            {isOpen && <DemoTree node={value} prefix={prefix + key + "/"} search={search} currentPath={currentPath} config={config} />}
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
            <div className={`text-black dark:text-white fixed top-3 left-3 z-40 ${clicked ? 'w-[280px]' : 'w-8'} ${clicked ? 'h-[calc(100vh-80px)]' : 'h-8'} transition-all`}>
                <div className={`${clicked ? 'w-[280px]' : 'w-[42px]'} bg-white/40 dark:bg-black/30 backdrop-blur-[2px] fixed top-[12px] left-[12px] hover:opacity-90 rounded-xl flex overflow-hidden border transition-all`}
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
                        className="bg-transparent focus:outline-none px-2 py-1 border-none placeholder-black/80 dark:placeholder-white/80 flex-grow"
                        type="text"
                        placeholder={`search ${activeTab}...`}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className={`${clicked ? 'overflow-y-scroll border border-foreground h-full opacity-100 backdrop-blur-[2px]' : 'opacity-0'} bg-white/40 dark:bg-black/30 px-2 rounded-xl noscrollbar select-none flex flex-col mt-12 transition-all`}>
                    {/* Tab buttons */}
                    <div className="flex gap-2 my-2 z-10">
                        <button
                            onClick={() => setActiveTab('demos')}
                            className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-all ${activeTab === 'demos'
                                ? 'bg-white/60 dark:bg-white/20 ring'
                                : 'hover:bg-white/30 dark:hover:bg-white/10 border'
                                }`}
                        >
                            demos
                        </button>
                        <button
                            onClick={() => setActiveTab('tools')}
                            className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-all ${activeTab === 'tools'
                                ? 'bg-white/60 dark:bg-white/20 ring'
                                : 'hover:bg-white/30 dark:hover:bg-white/10 border'
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
                </div>
            </div>
        </div>
    );
}
