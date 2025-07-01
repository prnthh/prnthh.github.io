"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Geist_Mono } from "next/font/google";
import { usePathname } from "next/navigation";

const allExperiments = [
    'barebones',
    'demos/drive', 'demos/punchball', 'demos/tickEngine',
    'floor/ground', 'floor/terrainCollider', 'floor/heightmap', 'floor/webgpu',
    'lighting/simple', 'lighting/shadowmap', 'lighting/cascading', 'lighting/probe', 'lighting/reflection',
    'instancing/simple', 'instancing/merged', 'instancing/instancedMesh2', 'instancing/InstanceProvider',
    'controllers/wawa', 'controllers/shouldercam', 'controllers/click', 'controllers/kick',
    'car/simple', 'car/road', 'car/driver',
    'editor/events', 'editor/store', 'editor/scene',
    'ik/ragdoll', 'ik/kick', 'ik/crawler',
    'retargeting/basic', 'retargeting/variety',
    'interior',
    'particles', 'tsl/webgpu', 'tsl/tiny',
    'npc', 'npc3', 'npc4',
    'xr',
    'milady/chess', 'milady/surfer',
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
        if (value === null) {
            return key.toLowerCase().includes(search.toLowerCase());
        } else {
            // Show folders if any child matches
            const hasMatch = (n: any): boolean => {
                return Object.entries(n).some(([k, v]) => {
                    if (v === null) return k.toLowerCase().includes(search.toLowerCase());
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
            {/* Minimal floating menu button */}
            <button
                onClick={() => setOpen(o => !o)}
                className="fixed top-3 left-3 z-50 bg-white/80 hover:bg-white/95 border border-slate-300 shadow-md rounded-full p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label={open ? 'Close menu' : 'Open menu'}
            >
                {/* Hamburger icon */}
                <span className="block w-5 h-5">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
                        <line x1="3" y1="6" x2="17" y2="6" strokeLinecap="round" />
                        <line x1="3" y1="10" x2="17" y2="10" strokeLinecap="round" />
                        <line x1="3" y1="14" x2="17" y2="14" strokeLinecap="round" />
                    </svg>
                </span>
            </button>
            {/* Minimal floating menu panel, now to the right of the icon */}
            {open && (
                <div className="fixed top-3 left-14 z-40 bg-white/95 rounded-xl flex flex-col p-3 max-h-[80vh] min-w-[220px] shadow-2xl border border-slate-200 animate-fade-in">
                    <input
                        className="mb-2 px-2 py-1 rounded border border-slate-200 bg-slate-50 text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />
                    {/* Render Demos and Other as top-level categories */}
                    <div className="mb-2 font-bold text-lg">Demos</div>
                    <DemoTree node={demoTreeObj.demos || demoTreeObj} search={search} currentPath={pathname} />
                    <div className="mb-2 mt-4 font-bold text-lg">Other</div>
                    <DemoTree node={otherTreeObj} search={search} currentPath={pathname} />
                </div>
            )}
        </div>
    );
}
