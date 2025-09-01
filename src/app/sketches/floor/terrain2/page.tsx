"use client";

import { Physics, RigidBody } from "@react-three/rapier";
import { Environment, OrbitControls, useDetectGPU } from "@react-three/drei";
import MartiniGeometry from "./MartiniGeometry";
import useProgressiveTextures from "./useProgressiveTextures";
import { Suspense, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Vector3, Vector4 } from "three";
import TerrainComponent from "./TerrainComponent";
import GameCanvas from "@/shared/GameCanvas";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics debug>
                        <Suspense fallback={null}>
                            <Terrain />
                            <Environment files="/terraindemo/sunflowers_puresky_1k.hdr" background={true} />
                            {/* <GroundedSkybox fog={false} /> */}
                        </Suspense>
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} castShadow intensity={1000} />
                        <OrbitControls />
                    </Physics>
                </GameCanvas>
            </div>
        </div>
    );
}

const Terrain = () => {
    // Replacing useControls with a plain object for default values

    const GPUTier = useDetectGPU();
    const slowGPU = (GPUTier.tier === 0 || GPUTier.isMobile);
    const { camera } = useThree();
    const [cameraPosition, setCameraPosition] = useState(new Vector3(0, 0, 0));

    const controls = {
        triplanar: false,
        gridless: true,
        ao: 0.62,
        meshError: 0,
        smoothness: 1.0,
        anisotropy: 4,
        surfaceSamples: 3,
        distanceOptimizedRendering: true,
        far: 100,
        useMacro: false,
        wireframe: false
    };
    const { triplanar, gridless, far, useMacro, distanceOptimizedRendering, ao, meshError, smoothness, wireframe, surfaceSamples, anisotropy } = controls;

    const [q, textures] = useProgressiveTextures([
        [
            "/terraindemo/aomap.png",
            "/terraindemo/Grass_02/ground_Grass1_col.jpg",
            "/terraindemo/Grass_02/ground_Grass1_norm.jpg",
            "/terraindemo/Mud_03/Ground_WetBumpyMud_col.jpg",
            "/terraindemo/Mud_03/Ground_WetBumpyMud_norm.jpg",
            "/terraindemo/Cliffs_02/Rock_DarkCrackyCliffs_col.jpg",
            "/terraindemo/Cliffs_02/Rock_DarkCrackyCliffs_norm.jpg",
            "/terraindemo/Rock_04/Rock_sobermanRockWall_col.jpg",
            "/terraindemo/Rock_04/Rock_sobermanRockWall_norm.jpg",
            `/terraindemo/heightmap@0.5.png`,
            `/terraindemo/normalmap.png`,
            `/terraindemo/splatmap_00.png`,
            `/terraindemo/splatmap_01.png`,
            "/terraindemo/DebugTexture/debug.jpg",
            "/terraindemo/DebugTexture/debug_norm.png",
            "/terraindemo/T_MacroVariation_sm.png",
            "/terraindemo/Grass_02/ground_Grass1_dsp.png",
            "/terraindemo/Mud_03/Ground_WetBumpyMud_dsp.png",
            "/terraindemo/Cliffs_02/Rock_DarkCrackyCliffs_dsp.png",
            "/terraindemo/Rock_04/Rock_sobermanRockWall_dsp.png"
        ],
    ]) as [number, any[][]];

    // const envMap = useEnvironment({files:'/sunflowers_puresky_4k.hdr', encoding: LinearEncoding});

    // envMap.magFilter = LinearFilter;
    // envMap.minFilter = LinearFilter;
    // console.log('envMap', envMap);


    const t = textures[q] as any[];


    const octaves = [
        {
            blur: 0.5,
            amplitude: 1.25,
            wavelength: 1024.0 * 16.0,
            accuracy: 1.25,
        },
        {
            blur: 1.0,
            amplitude: 1.0,
            wavelength: 1024.0 * 64.0,
            accuracy: 1.0,
        },
    ];

    const debugDiffuse = false; // debugTextures
    const debugNormal = false; // debugTextures

    const grass2 = {
        diffuse: debugDiffuse ? t[13] : t[1],
        normal: debugNormal ? t[14] : t[2],
        normalStrength: 0.3,
        repeat: 300,
        gridless: gridless,
        aperiodic: gridless,
        saturation: 0.55,
        tint: new Vector4(0.7, 0.8, 0.7, 1),
        displacement: t[16],
    };

    const grass1 = {
        diffuse: debugDiffuse ? t[13] : t[1],
        normal: debugNormal ? t[14] : t[2],
        normalStrength: 0.3,
        repeat: 300,
        // saturation: 0.5,
        gridless: gridless,
        aperiodic: gridless,
        tint: new Vector4(0.8, 0.9, 0.8, 1),
        displacement: t[16],
    };

    const noiseBlend = false;
    if (noiseBlend) {
        //@ts-expect-error sucks
        grass1.blend = {
            mode: "noise",
            octaves,
        };
        //@ts-expect-error sucks
        grass2.blend = {
            mode: "noise",
            octaves,
        };
    }

    const mud = {
        diffuse: debugDiffuse ? t[13] : t[3],
        normal: debugNormal ? t[14] : t[4],
        normalStrength: 0.5,
        repeat: 300,
        saturation: 0.5,
        displacement: t[17],
    };

    const clif = {
        diffuse: debugDiffuse ? t[13] : t[7],
        normal: debugNormal ? t[14] : t[8],
        normalStrength: 0.5,
        normalY: -1,
        flipNormals: true,
        tint: new Vector4(1.2, 1.2, 1.2, 1),
        triplanar: triplanar,
        gridless: gridless,
        aperiodic: gridless,
        repeat: 300,
        saturation: 0.5,
        displacement: t[18],
    };

    const rock = {
        diffuse: debugDiffuse ? t[13] : t[5],
        normal: debugNormal ? t[14] : t[6],
        normalStrength: 0.4,
        tint: new Vector4(1.2, 1.2, 1.2, 1),
        triplanar: triplanar,
        gridless: gridless,
        aperiodic: gridless,
        repeat: 300,
        saturation: 0.3,
        displacement: t[19],
    };

    return <mesh rotation={[(-1 * Math.PI) / 2, 0, (-3.35 * Math.PI) / 2]}>
        <MartiniGeometry displacementMap={t[0]} error={meshError} mobileError={meshError + 200} />
        <TerrainComponent
            splats={[t[11], t[12]]}
            surfaces={[rock, { ...clif, normalStrength: 0.5 }, mud, grass1, grass2, mud, mud]}
            normalMap={t[10]}
            displacementMap={t[9]}
            displacementScale={120}
            // optional parameters -------------------
            displacementBias={0.0}
            envMapIntensity={0.75}
            metalness={0.125}
            aoMap={t[0]}
            aoMapIntensity={ao}
            roughness={0.8}
            wireframe={wireframe}
            anisotropy={anisotropy}
            surfaceSamples={surfaceSamples}
            smoothness={smoothness}
            macroMap={t[15]}
            distanceOptimized={distanceOptimizedRendering}
            distanceTextureScale={slowGPU ? 1 / 6 : 1 / 2}
            far={far}
            meshSize={1024}
        />
    </mesh>
}