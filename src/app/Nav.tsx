"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Shebang from "@/shared/ui/shebang";

const experimentsConfig: Record<string, { name?: string; description?: string; external?: boolean }> = {
    'react-three-game': { external: true },
    'demos/mechanics': {
        description: 'Basic game mechanics with a third-person character controller.'
    },
    'demos/killbox': {
        description: 'First-person multiplayer shooting gallery with physics-based ragdolls.'
    },
    'demos/colony': {
        description: 'A top-down world with autonomous NPCs and basic AI behaviors.'
    },
    'demos/runner': {
        description: 'Endless runner game demo with procedural level generation.'
    },
    'demos/scumm': {
        description: 'A simple point-and-click adventure game demo inspired by classic SCUMM games.'
    },
    'demos/world': {},
    'sketches/floor': {
        description: 'A variety of floor shaders and techniques for realistic and stylized surfaces.'
    },
    'sketches/lighting': {
        description: 'Lighting and reflections.'
    },
    'react-three-terrain': {},
    'react-three-controller/combined': {},
    'react-three-controller/firstperson': {},
    'sketches/tools/prefabeditor': {},
    'sketches/tools/assetviewer': {},
    'sketches/tools/character': {},
    'sketches/tools/dragdrop': {},
    'sketches/car/simple': {},
    'sketches/car/road': {},
    'sketches/navmesh/raycast': {},
    'sketches/navmesh/navmesh': {},
    'sketches/ik/ragdoll': {},
    'sketches/ik/crawler': {},
    'sketches/instancing/simple': {},
    'sketches/instancing/merged': {},
    'sketches/instancing/InstanceProvider': {},
    'sketches/instancing/crowd': {},
    'sketches/instancing/npc4': {},
    'sketches/retargeting/basic': {},
    'sketches/retargeting/variety': {},
    'sketches/particles': {},
    'sketches/ecs-world': {},
    '../wfc/index.html': {},
    '../chainreaction.html': {}
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

const allExperiments = Object.keys(experimentsConfig);
const treeObj = buildTree(allExperiments);

function DemoTree({ node, prefix = "", search = "", currentPath = "" }: { node: any; prefix?: string; search?: string; currentPath?: string }) {
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
                    const fullPath = typeof value === "string" ? value : prefix + key;
                    const normalize = (p: string) => p.replace(/[?#].*$/, '').replace(/\/$/, '');
                    const isActive = normalize(currentPath || '') === `/${normalize(fullPath)}`;
                    const config = experimentsConfig[fullPath.replace(/^sketches\//, '')];
                    const isExternal = config?.external;

                    return isExternal ? (
                        <a
                            href={`/${fullPath}`}
                            key={fullPath}
                            className={`rounded px-2 py-1 transition-colors select-none
                                ${isActive ? "font-bold dark:bg-white/10 bg-black/10 ring" : "hover:ring cursor-pointer"}`}
                        >
                            {displayName} <br />
                            <span className="text-sm font-light">
                                {config?.description}
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
                                {config?.description}
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
                            {isOpen && <DemoTree node={value} prefix={prefix + key + "/"} search={search} currentPath={currentPath} />}
                        </div>
                    );
                }
            })}
        </div>
    );
}

export default function Nav() {
    const [open, setOpen] = useState(false);
    const [clicked, setClicked] = useState(false);
    const [search, setSearch] = useState("");
    const pathname = usePathname();

    return (
        <div>
            <div className={`text-black dark:text-white fixed top-3 left-3 z-40 ${clicked || open ? 'w-[280px]' : 'w-8'} ${clicked ? 'h-[calc(100vh-80px)]' : open ? 'h-[100px]' : 'h-8'} transition-all`}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => { setClicked(false); setOpen(false); }}
            >
                <div className={`${open ? 'w-[280px]' : 'w-[42px]'} bg-white/40 dark:bg-black/30 backdrop-blur-[2px] fixed top-[12px] left-[12px] hover:opacity-90 rounded-xl flex overflow-hidden border transition-all`}
                    onClick={() => setClicked(() => true)}
                    onMouseLeave={e => { !clicked && setOpen(false); }}
                >
                    <button
                        aria-label={open ? 'Close menu' : 'Open menu'}
                        onClick={(e) => { setClicked(o => !o); e.stopPropagation(); }}
                    >
                        <span className="block w-10 h-10">
                            <Shebang />
                        </span>
                    </button>
                    <input
                        className="bg-transparent  focus:outline-none px-2 py-1 border-none placeholder-black/80 dark:placeholder-white/80 flex-grow"
                        type="text"
                        placeholder="search demos..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className={`${clicked ? 'overflow-y-scroll border border-foreground h-full opacity-100 backdrop-blur-[2px]' : open ? 'h-[40px] border opacity-50' : 'opacity-0'}  bg-white/40 dark:bg-black/30 px-2 rounded-xl noscrollbar select-none flex flex-col mt-12 transition-all`}>
                    <div className="my-1 font-bold text-lg ">Demos</div>
                    {clicked && <DemoTree node={treeObj} search={search} currentPath={pathname} />}
                </div>

            </div>
        </div>
    );
}
