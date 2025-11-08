"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Geist_Mono } from "next/font/google";
import { usePathname } from "next/navigation";
import Shebang from "@/shared/ui/shebang";

const allExperiments = [
    'barebones',
    'demos/basic', 'demos/drive', 'demos/punchball', 'demos/sidescroller', 'demos/walkingsimulator',
    'tools/character', 'tools/worldeditor',
    'floor/ground', 'floor/terrainCollider', 'floor/heightmap', 'floor/splat', 'floor/terrain2',
    'lighting/simple', 'lighting/probe',
    'instancing/simple', 'instancing/merged', 'instancing/instancedMesh2', 'instancing/InstanceProvider', 'instancing/npc', 'instancing/npc3', 'instancing/npc4', 'instancing/npc5', 'instancing/npc6',
    'controllers/wawa', 'controllers/shouldercam', 'controllers/click', 'controllers/kick',
    'car/simple', 'car/road', 'car/driver',
    'editor/scene', 'editor/dragdrop',
    'ik/ragdoll', 'ik/kick', 'ik/crawler',
    'retargeting/basic', 'retargeting/variety',
    'interior',
    'particles', 'tsl/webgpu', 'tsl/neo',
    '../wfc/index.html', '../chainreaction.html'
].map(e => `sketches/${e}`); // Prefix all with 'sketches/'

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

// Separate demos and others
const demos = allExperiments.filter(e => e.startsWith("sketches/demos/"));
const others = allExperiments.filter(e => !e.startsWith("sketches/demos/"));

// For demos, strip 'sketches/demos/' prefix for a flat tree, but keep original path for links
const demoEntries = demos.map(e => ({
    display: e.replace(/^sketches\/demos\//, ""),
    full: e
}));
// Build a tree using display names, but store full path for links
function buildDemoTree(entries: { display: string, full: string }[]) {
    const tree: any = {};
    for (const { display, full } of entries) {
        const parts = display.split("/");
        let node = tree;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === parts.length - 1) {
                node[part] = full; // store full path at leaf
            } else {
                if (!node[part]) node[part] = {};
                node = node[part];
            }
        }
    }
    return tree;
}
const demoTreeObj = buildDemoTree(demoEntries);
// For others, keep as before (still nested under 'sketches')
const otherTreeObj = buildTree(others);


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
        <div className="">
            {entries.map(([key, value]) => {
                if (typeof value === "string" || value === null) {
                    // Leaf node
                    const displayName = key;
                    const fullPath = typeof value === "string" ? value : prefix + key;
                    // Normalize paths: remove trailing slashes, ignore query/hash
                    const normalize = (p: string) => p.replace(/[?#].*$/, '').replace(/\/$/, '');
                    const isActive = normalize(currentPath || '') === `/${normalize(fullPath)}`;
                    return (
                        <Link
                            href={`/${fullPath}`}
                            prefetch={true}
                            key={fullPath}
                            className={`block tracking-[-.01em] ${geistMono.variable} rounded px-2 py-1 transition-colors cursor-pointer select-none
                                ${isActive ? "bg-blue-600 text-white font-bold" : "hover:bg-slate-400 bg-slate-200 text-black"}`}
                            style={{ textDecoration: 'none' }}
                        >
                            {displayName}
                        </Link>
                    );
                } else {
                    // Category node
                    const isOpen = open[key] || false;
                    return (
                        <div key={prefix + key}>
                            <div
                                className={`flex items-center rounded px-2 py-1 font-bold select-none cursor-pointer transition-colors
                                    ${isOpen ? "bg-slate-300" : "hover:bg-slate-400 bg-slate-200"}`}
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
    const [search, setSearch] = useState("");
    // Use the new trees
    const pathname = usePathname();

    return (
        <div>
            {/* Minimal floating menu panel, now to the right of the icon */}
            <div className={`${open ? 'w-[220px] h-[calc(100vh-80px)]' : 'w-8 h-8 rounded-full'} text-black transition-all fixed top-3 left-3 z-40`}>
                <div className="fixed top-[12px] left-[12px] bg-white/95 rounded-xl flex overflow-hidden border">
                    <button
                        className="hover:bg-slate-200 transition-all"
                        onClick={() => setOpen(o => !o)}
                        aria-label={open ? 'Close menu' : 'Open menu'}
                    >
                        {/* Hamburger icon */}
                        <span className="block w-10 h-10">
                            <Shebang />
                        </span>
                    </button>
                    {open && <input
                        className="bg-transparent focus:outline-none px-2 py-1 rounded border border-slate-200 bg-slate-50 text-black"
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />}
                </div>
                {open && <>
                    <div className="mt-12 flex flex-col h-full overflow-y-scroll bg-white/95 border rounded-xl noscrollbar px-2">
                        {/* Render Demos and Other as top-level categories */}
                        <div className="mb-2 font-bold text-lg">Demos</div>
                        <DemoTree node={demoTreeObj.demos || demoTreeObj} search={search} currentPath={pathname} />
                        <div className="mb-2 mt-4 font-bold text-lg">Other</div>
                        <DemoTree node={otherTreeObj} search={search} currentPath={pathname} />
                    </div>
                </>}
            </div>
        </div>
    );
}
