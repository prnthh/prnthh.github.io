"use client"

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { WebGPURenderer } from 'three/webgpu'
import { useRef, useState, useMemo, useEffect } from 'react'
import * as THREE from 'three'

const GRID_SIZE = 16
const HALF_GRID = Math.floor(GRID_SIZE / 2)

// Color palette (Replicube style - index 0 is empty/air)
const COLORS = [
    null, // 0 = empty
    '#FFFFFF', // 1 = white
    '#FF0000', // 2 = red
    '#00FF00', // 3 = green
    '#0000FF', // 4 = blue
    '#FFFF00', // 5 = yellow
    '#FF00FF', // 6 = magenta
    '#00FFFF', // 7 = cyan
    '#FF8800', // 8 = orange
    '#8800FF', // 9 = purple
    '#88FF00', // 10 = lime
    '#0088FF', // 11 = sky blue
    '#FF0088', // 12 = pink
    '#888888', // 13 = gray
    '#444444', // 14 = dark gray
    '#000000', // 15 = black
]

interface VoxelData {
    position: [number, number, number]
    color: string
}

function evaluateReplicube(code: string): VoxelData[] {
    const voxels: VoxelData[] = []

    for (let x = -HALF_GRID; x <= HALF_GRID; x++) {
        for (let y = -HALF_GRID; y <= HALF_GRID; y++) {
            for (let z = -HALF_GRID; z <= HALF_GRID; z++) {
                try {
                    // Convert Lua-style syntax to JavaScript
                    let jsCode = code
                        .replace(/\band\b/g, '&&')
                        .replace(/\bor\b/g, '||')
                        .replace(/\bnot\b/g, '!')
                        .replace(/\bthen\b/g, '{')
                        .replace(/\bend\b/g, '}')
                        .replace(/\belseif\b/g, '} else if')
                        .replace(/\belse\b/g, '} else {')
                        .replace(/~=/g, '!=')
                        .replace(/(?<!=)==(?!=)/g, '==')

                    // Create a function that evaluates the code
                    const func = new Function('x', 'y', 'z', `
                        const abs = Math.abs;
                        const floor = Math.floor;
                        const ceil = Math.ceil;
                        const sqrt = Math.sqrt;
                        const sin = Math.sin;
                        const cos = Math.cos;
                        const max = Math.max;
                        const min = Math.min;
                        ${jsCode}
                    `)

                    const result = func(x, y, z)

                    if (result && result > 0 && result < COLORS.length) {
                        const colorIndex = Math.floor(result)
                        if (COLORS[colorIndex]) {
                            voxels.push({
                                position: [x, y, z],
                                color: COLORS[colorIndex]!
                            })
                        }
                    }
                } catch (e) {
                    // Skip evaluation errors
                }
            }
        }
    }

    return voxels
}

function InstancedVoxels({ voxels }: { voxels: VoxelData[] }) {
    const meshRef = useRef<THREE.InstancedMesh>(null)
    const tempObject = useMemo(() => new THREE.Object3D(), [])
    const tempColor = useMemo(() => new THREE.Color(), [])

    useEffect(() => {
        if (!meshRef.current || voxels.length === 0) return

        // Initialize instance color buffer if needed
        if (!meshRef.current.instanceColor) {
            const colors = new Float32Array(meshRef.current.count * 3)
            meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3)
        }

        voxels.forEach((voxel, i) => {
            tempObject.position.set(...voxel.position)
            tempObject.updateMatrix()
            meshRef.current!.setMatrixAt(i, tempObject.matrix)
            tempColor.set(voxel.color)
            meshRef.current!.setColorAt(i, tempColor)
        })

        meshRef.current.instanceMatrix.needsUpdate = true
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true
        }
        meshRef.current.count = voxels.length
    }, [voxels, tempObject, tempColor])

    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.002
        }
    })

    const maxInstances = GRID_SIZE * GRID_SIZE * GRID_SIZE

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, maxInstances]} castShadow receiveShadow>
            <boxGeometry args={[0.95, 0.95, 0.95]} />
            <meshPhongMaterial vertexColors />
        </instancedMesh>
    )
}

function Scene({ voxels }: { voxels: VoxelData[] }) {
    return (
        <>
            <color args={['#ffbbbbff']} attach="background" />
            <ambientLight intensity={1} />
            <directionalLight
                position={[10, 20, 10]}
                intensity={1}
                castShadow
                shadow-mapSize={[2048, 2048]}
            />
            <pointLight position={[-10, -10, -10]} intensity={0.3} color="#4488ff" />

            <InstancedVoxels voxels={voxels} />

            <gridHelper args={[GRID_SIZE, GRID_SIZE, '#333', '#222']} position={[0, -HALF_GRID - 0.5, 0]} />

            <OrbitControls
                enableDamping
                dampingFactor={0.05}
                minDistance={5}
                maxDistance={50}
            />
        </>
    )
}

const EXAMPLE_PROGRAMS = [
    {
        name: 'Sphere',
        code: `if (x*x + y*y + z*z < 49) {
  return 3
}`
    },
    {
        name: 'Cube Frame',
        code: `if (y == 1 || (y < 2 && x*x == 4 && z*z == 4)) {
  return 15
}`
    },
    {
        name: 'Diamond',
        code: `if (abs(x) + abs(y) + abs(z) < 8) {
  return 5
}`
    },
    {
        name: 'Checkered',
        code: `if ((x + y + z) % 2 == 0 && abs(x) < 5 && abs(y) < 5 && abs(z) < 5) {
  return 2
}`
    },
    {
        name: 'Torus',
        code: `const R = 6;
const r = 2;
const d = sqrt(x*x + z*z) - R;
if (d*d + y*y < r*r) {
  return 8
}`
    },
    {
        name: 'Stairs',
        code: `if (x >= 0 && x < 8 && z >= 0 && z < 8 && y >= 0 && y <= x) {
  return 13
}`
    },
]

export default function App() {
    const [code, setCode] = useState(EXAMPLE_PROGRAMS[0].code)
    const [voxels, setVoxels] = useState<VoxelData[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        try {
            const result = evaluateReplicube(code)
            setVoxels(result)
            setError(null)
        } catch (e: any) {
            setError(e.message)
        }
    }, [code])

    return (
        <div className="relative w-full h-screen bg-black">
            {/* 3D Canvas */}
            <Canvas
                shadows
                gl={async (props) => {
                    const renderer = new WebGPURenderer(props as any)
                    await renderer.init()
                    return renderer
                }}
                camera={{ position: [20, 15, 20], fov: 50, near: 0.25, far: 100 }}
            >
                <Scene voxels={voxels} />
            </Canvas>

            {/* Code Editor Overlay */}
            <div className="absolute top-4 left-4 w-96 bg-gray-900/90 backdrop-blur rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                    <span className="text-white font-mono text-sm">Replicube Editor</span>
                    <span className="text-gray-400 text-xs">{voxels.length} voxels</span>
                </div>

                {/* Example buttons */}
                <div className="flex flex-wrap gap-1 p-2 bg-gray-800/50 border-b border-gray-700">
                    {EXAMPLE_PROGRAMS.map((prog) => (
                        <button
                            key={prog.name}
                            onClick={() => setCode(prog.code)}
                            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                        >
                            {prog.name}
                        </button>
                    ))}
                </div>

                <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-64 p-4 bg-transparent text-green-400 font-mono text-sm resize-none focus:outline-none"
                    spellCheck={false}
                    placeholder="Enter your Replicube code..."
                />

                {error && (
                    <div className="px-4 py-2 bg-red-900/50 border-t border-red-700 text-red-300 text-xs font-mono">
                        {error}
                    </div>
                )}

                <div className="px-4 py-2 bg-gray-800/50 border-t border-gray-700 text-gray-500 text-xs">
                    <p>Variables: x, y, z (range: -{HALF_GRID} to {HALF_GRID})</p>
                    <p>Return color index (1-15) to place a voxel</p>
                    <p>Functions: abs, sqrt, sin, cos, floor, ceil, min, max</p>
                </div>
            </div>
        </div>
    )
}
