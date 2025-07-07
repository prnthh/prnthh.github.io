import { Canvas, type CanvasProps } from '@react-three/fiber';
import { Suspense, useState } from 'react';
import tunnel from 'tunnel-rat';

// suspense is broken in react 19, see https://github.com/pmndrs/react-three-fiber/issues/3222

const ui = tunnel()

export const GameCanvas = ({
    children,
    ...props
}: React.PropsWithChildren<CanvasProps>) => {
    const [loading, setLoading] = useState(true);

    return (
        <>
            <ui.Out />
            {loading && <Loading />}
            <Canvas
                shadows
                {...props}
            >
                <Suspense>
                    {children}
                    <DelayedLoadingScreen onLoad={() => setLoading(false)} />
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

const DelayedLoadingScreen = ({ onLoad }: { onLoad: () => void }) => {
    setTimeout(() => {
        onLoad();
    }, 2000);
    // todo - wait till framerate stabilizes
    return null;
};