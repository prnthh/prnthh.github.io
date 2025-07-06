import { Canvas, type CanvasProps } from '@react-three/fiber';
import type * as React from 'react';
import { Suspense } from 'react';
import tunnel from 'tunnel-rat';

// suspense is broken in react 19, see https://github.com/pmndrs/react-three-fiber/issues/3222

const ui = tunnel()

export const GameCanvas = ({
    children,
    ...props
}: React.PropsWithChildren<CanvasProps>) => {

    return (
        <>
            <ui.Out />
            <Canvas
                shadows
                {...props}
            >
                <Suspense fallback={<ui.In><Loading /></ui.In>}>
                    {children}
                </Suspense>
            </Canvas>
        </>
    );
};

const Loading = () => {
    return (
        <div className="absolute flex items-center justify-center w-screen h-screen z-50 bg-black text-white">
            Loading...
        </div>
    );
}