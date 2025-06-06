"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Geist_Mono } from "next/font/google";
import { usePathname } from "next/navigation";

const allExperiments = [
    'barebones',
    'floor/ground', 'floor/terrainCollider', 'floor/heightmap',
    'lighting/simple', 'lighting/shadowmap', 'lighting/cascading', 'lighting/probe', 'lighting/reflection',
    'instancing/simple', 'instancing/merged',
    'controllers/wawa', 'controllers/shouldercam', 'controllers/click', 'controllers/isocam', 'controllers/animations',
    'car/simple', 'car/model', 'car/road', 'car/driver',
    'editor/events', 'editor/store',
    'ik/ragdoll', 'ik/kick', 'ik/crawler',
    'retargeting/basic', 'retargeting/variety',
    'interior',
    'particles', 'tsl/webgpu', 'tsl/tiny',
    'npc', 'scape',
    'xr',
    'milady/chess', 'milady/surfer',
    '../wfc/index.html', '../chainreaction.html'
].map(e => `sketches/${e}`); // Prefix all with 'sketches/'

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

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
                if (value === null) {
                    // Leaf node
                    const displayName = key;
                    const fullPath = prefix + key;
                    // Normalize paths: remove trailing slashes, ignore query/hash
                    const normalize = (p: string) => p.replace(/[?#].*$/, '').replace(/\/$/, '');
                    // Adjusted: currentPath may start with /sketches, so match accordingly
                    const isActive = normalize(currentPath || '') === `/${normalize(fullPath)}`;
                    return (
                        <Link
                            href={`/${fullPath}`}
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
    const [search, setSearch] = useState("");
    const demoTree = buildTree(allExperiments);
    const pathname = usePathname();
    return (
        <div className="absolute top-2 left-2 bg-slate-500 rounded flex flex-col p-2 max-h-[90vh] overflow-auto min-w-[220px] shadow-lg border border-slate-600">
            <input
                className="mb-2 px-2 py-1 rounded border border-slate-400 bg-slate-100 text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
            <DemoTree node={demoTree} search={search} currentPath={pathname} />
        </div>
    );
}
