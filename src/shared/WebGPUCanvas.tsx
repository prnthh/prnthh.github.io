import { Canvas, type CanvasProps } from '@react-three/fiber';
import type * as React from 'react';
import { Suspense } from 'react';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { WebGPURenderer } from 'three/webgpu';
import tunnel from 'tunnel-rat';

export type WebGPUCanvasProps = {
    /**
     * @default false
     */
    forceWebGL?: boolean;
    /**
     * @default false
     */
    forceWebGPU?: boolean;

    gl?: ConstructorParameters<typeof WebGPURenderer>[0];
} & Omit<CanvasProps, 'gl'>

const ui = tunnel()

export const WebGPUCanvas = ({
    children,
    forceWebGL = false,
    forceWebGPU = false,
    gl,
    ...props
}: React.PropsWithChildren<WebGPUCanvasProps>) => {
    if (forceWebGPU && !WebGPU.isAvailable()) {
        return (
            <div className='absolute flex items-center justify-center w-screen h-screen z-50 bg-black text-white'>
                <div className='text-center'>
                    Your browser doesn't support WebGPU, this content cannot be
                    displayed.
                </div>
            </div>
        );
    }

    return (
        <>
            <Canvas
                {...props}
                id="gl"
                gl={async ({ canvas }) => {
                    const renderer = new WebGPURenderer({
                        ...gl,
                        canvas: canvas as HTMLCanvasElement,
                        forceWebGL,
                    });
                    await renderer?.init();
                    return renderer;
                }}
            >
                <Suspense fallback={<ui.In><Loading /></ui.In>}>

                    {children}
                </Suspense>
            </Canvas>
            <ui.Out />
        </>
    );
};

const Loading = () => {
    return (
        <div className="absolute flex items-center justify-center w-screen h-screen z-[1000] bg-black text-white">
            Loading...
        </div>
    );
}