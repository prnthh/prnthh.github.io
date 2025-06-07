/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license found in the LICENSE
 * file in the root directory of this source tree.
 */

import React, { useMemo, createContext, useState, useContext, useEffect } from 'react';
import { KeyboardControls, KeyboardControlsEntry } from '@react-three/drei';
import Joystick from './Joystick';

export enum WalkControls {
    forward = 'forward',
    backward = 'backward',
    left = 'left',
    right = 'right',
    jump = 'jump',
    run = 'run',
    use = 'use',
    altUse = 'altUse',
    reset = 'reset',
}

const walkControlKeys = [
    { name: WalkControls.forward, keys: ['ArrowUp', 'KeyW'] },
    { name: WalkControls.backward, keys: ['ArrowDown', 'KeyS'] },
    { name: WalkControls.left, keys: ['ArrowLeft', 'KeyA'] },
    { name: WalkControls.right, keys: ['ArrowRight', 'KeyD'] },
    { name: WalkControls.run, keys: ['Shift'] },
    { name: WalkControls.jump, keys: ['Space'] },
    { name: WalkControls.use, keys: ['KeyE'] },
    { name: WalkControls.altUse, keys: ['KeyQ'] },
    { name: WalkControls.reset, keys: ['KeyR'] },
]


export enum DriveControls {
    forward = 'forward',
    backward = 'backward',
    left = 'left',
    right = 'right',
    use = 'use',
    run = 'run',
    altUse = 'altUse',
    brake = 'brake',
    reset = 'reset',
}

const driveControlKeys = [
    { name: DriveControls.forward, keys: ['ArrowUp', 'KeyW'] },
    { name: DriveControls.backward, keys: ['ArrowDown', 'KeyS'] },
    { name: DriveControls.left, keys: ['ArrowLeft', 'KeyA'] },
    { name: DriveControls.right, keys: ['ArrowRight', 'KeyD'] },
    { name: DriveControls.run, keys: ['Shift'] },
    { name: DriveControls.use, keys: ['KeyE'] },
    { name: DriveControls.altUse, keys: ['KeyQ'] },
    { name: DriveControls.brake, keys: ['Space'] },
    { name: DriveControls.reset, keys: ['KeyR'] },
]


const controlSchemes = {
    simple: walkControlKeys,
    drive: driveControlKeys,
    none: [],
}

export type ControlName = WalkControls | DriveControls;

const ControlSchemeContext = createContext<{
    scheme: keyof typeof controlSchemes;
    setScheme: React.Dispatch<React.SetStateAction<keyof typeof controlSchemes>>
}>({
    scheme: 'simple',
    setScheme: () => { },
});

export const useControlScheme = () => useContext(ControlSchemeContext);

function isMobileDevice() {
    if (typeof navigator === 'undefined') return false;
    return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

function Controls({ children }: { children: React.ReactNode }) {
    const [controlScheme, setControlScheme] = useState<keyof typeof controlSchemes>('simple');
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(isMobileDevice());
    }, []);

    const map = useMemo<KeyboardControlsEntry<ControlName>[]>(() => (controlSchemes[controlScheme]), [controlScheme])

    return (
        <ControlSchemeContext.Provider value={{
            scheme: controlScheme,
            setScheme: setControlScheme
        }}>
            <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: 100,
                background: 'rgba(0,0,0,0.5)',
                padding: '10px',
                borderRadius: '5px',
                color: 'white'
            }}>{controlScheme} controls
            </div>
            <KeyboardControls map={map}>
                {children}
                {isMobile && (
                    <div className='absolute bottom-10 left-10 z-50 text-white'>
                        <Joystick controlScheme={controlScheme} />
                    </div>
                )}
            </KeyboardControls>
        </ControlSchemeContext.Provider>
    );
}

export default Controls;
