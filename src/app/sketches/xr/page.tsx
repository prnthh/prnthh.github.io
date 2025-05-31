"use client";

import { Canvas } from '@react-three/fiber'
import { XR, XROrigin, createXRStore, useXRControllerLocomotion } from '@react-three/xr'
import { useRef, useState } from 'react'

const store = createXRStore({
    hand: { touchPointer: false },
    offerSession: 'immersive-vr',
})

// this demo only works if the app is run in a secure context (https or localhost)
// and the browser supports WebXR
// to run it, you can use the following command:
// next dev --turbopack --experimental-https


export default function Home() {
    const [red, setRed] = useState(false)

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas>
                    <XR store={store}>
                        <mesh pointerEventsType={{ deny: 'grab' }} onClick={() => setRed(!red)} position={[0, 1, -1]}>
                            <boxGeometry />
                            <meshBasicMaterial color={red ? 'red' : 'blue'} />
                        </mesh>
                        <group position={[0, -5, 0]}>
                            <ControlledXROrigin />
                        </group>
                    </XR>
                </Canvas>
            </div>
            <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-row gap-x-4'>
                <button onClick={() => store.enterAR()}>Enter AR</button>
                <button onClick={() => store.enterVR()}>Enter VR</button>
            </div>
        </div>
    );
}

function ControlledXROrigin() {
    const ref = useRef(null)
    useXRControllerLocomotion(ref, { speed: 10 })
    return <XROrigin ref={ref} scale={10} />
}
