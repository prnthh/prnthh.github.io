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

const navConfig: Record<string, ItemConfig> = {
    'react-three-controller/navmesh': {
        path: 'react-three-controller/navmesh',
        description: 'First-person controller component.'
    },
    'react-three-controller/scumm': {
        path: 'react-three-controller/scumm2',
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
        path: 'react-three-character/editor',
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
    'floor': {
        path: 'sketches/floor',
        description: 'A variety of floor shaders and techniques for realistic and stylized surfaces.'
    },
    'particles': {
        path: 'sketches/particles',
        description: 'Particle system experiments.'
    },
    'wfc': {
        path: '../wfc/index.html',
        description: 'Wave function collapse algorithm.'
    },
    'eth-pcp': {
        path: 'Pockit-Challenge-Protocol',
        external: true,
        description: 'EVM Pockit Challenge Protocol implementation.'
    },
};

type TreeNode = {
    [key: string]: TreeNode | null;
};

// Helper to build a tree from the flat list
function buildTree(paths: string[]) {
    const tree: TreeNode = {};
    for (const path of paths) {
        const parts = path.split("/");
        let node: TreeNode = tree;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!node[part]) node[part] = i === parts.length - 1 ? null : {};
            node = node[part] ?? {};
        }
    }
    return tree;
}

const navTree = buildTree(Object.keys(navConfig));

function hasTreeMatch(node: TreeNode, search: string): boolean {
    return Object.entries(node).some(([key, value]) => {
        if (value === null) {
            return key.toLowerCase().includes(search.toLowerCase());
        }
        return key.toLowerCase().includes(search.toLowerCase()) || hasTreeMatch(value, search);
    });
}

function DemoTree({ node, prefix = "", search = "", currentPath = "", config }: { node: TreeNode; prefix?: string; search?: string; currentPath?: string; config: Record<string, ItemConfig> }) {
    const [open, setOpen] = useState<{ [k: string]: boolean }>({});
    // Filter nodes by search
    const entries = Object.entries(node).filter(([key, value]) => {
        if (!search) return true;
        if (value === null) {
            return key.toLowerCase().includes(search.toLowerCase());
        }
        return hasTreeMatch(value, search) || key.toLowerCase().includes(search.toLowerCase());
    });
    return (
        <div className="flex flex-col">
            {entries.map(([key, value]) => {
                if (value === null) {
                    // Leaf node
                    const displayName = key;
                    const lookupKey = prefix + key;
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
                            <button
                                type="button"
                                className={`flex items-center px-2 py-1 select-none cursor-pointer transition-colors text-xs uppercase tracking-widest text-neutral-500 hover:text-neutral-300`}
                                onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen((o) => ({ ...o, [key]: !o[key] })); }}
                            >
                                <span className="mr-1">{isOpen ? "−" : "+"}</span>
                                {key}
                            </button>
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
    const pathname = usePathname();

    return (
        <div>
            <div className={`text-neutral-200 fixed top-3 left-3 z-40 ${clicked ? 'w-[280px]' : 'w-8'} ${clicked ? 'h-[calc(100vh-80px)]' : 'h-8'} transition-all`}>
                <div className={`${clicked ? 'w-[280px]' : 'w-[42px]'} bg-neutral-800/90 backdrop-blur-sm fixed top-[12px] left-[12px] hover:bg-neutral-800 border border-neutral-700 flex overflow-hidden transition-all`}>
                    <button
                        type="button"
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
                        placeholder="SEARCH..."
                        value={search}
                        onFocus={() => setClicked(true)}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                {clicked && <div className={`${clicked ? 'overflow-y-scroll border border-neutral-700 h-full opacity-100 backdrop-blur-sm' : 'opacity-0'} bg-neutral-800/90 px-2 noscrollbar select-none flex flex-col mt-12 transition-all`}>
                    <DemoTree node={navTree} search={search} currentPath={pathname} config={navConfig} />
                </div>}
            </div>
        </div>
    );
}
