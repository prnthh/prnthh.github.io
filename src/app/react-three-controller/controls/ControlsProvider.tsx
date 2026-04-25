/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license found in the LICENSE
 * file in the root directory of this source tree.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Joystick, Button } from './TouchscreenControls';
import KeyboardInput from './KeyboardControls';
import PointerLockControls from './PointerLockControls';

type LookHandler = (dx: number, dy: number) => void;

type ControlsContextValue = {
    setLookHandler: (handler: LookHandler | null) => void;
};

const ControlsContext = createContext<ControlsContextValue | null>(null);

export function useControls() {
    const context = useContext(ControlsContext);
    if (!context) {
        throw new Error('useControls must be used within Controls');
    }
    return context;
}

function isMobileDevice() {
    if (typeof navigator === 'undefined') return false;

    // Check for touch support
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Check user agent
    const isMobileUA = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

    // Return true if either touch is supported OR it's a mobile user agent
    return hasTouch || isMobileUA;
}

function Controls({ children }: { children: React.ReactNode }) {
    const [isMobile, setIsMobile] = useState(false);
    const lookHandlerRef = useRef<LookHandler | null>(null);

    useEffect(() => {
        setIsMobile(isMobileDevice());
    }, []);

    const handleTap = () => {
        // Check if we're on mobile and not already in fullscreen
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            const elem = document.documentElement;
            if (!document.fullscreenElement) {
                elem.requestFullscreen?.() ||
                    (elem as any).webkitRequestFullscreen?.() ||
                    (elem as any).mozRequestFullScreen?.() ||
                    (elem as any).msRequestFullscreen?.();
            }
        }
    };

    const setLookHandler = useCallback((handler: LookHandler | null) => {
        lookHandlerRef.current = handler;
    }, []);

    const controlsContextValue = useMemo<ControlsContextValue>(() => ({
        setLookHandler,
    }), [setLookHandler]);

    return (
        <ControlsContext.Provider value={controlsContextValue}>
            <div className='contents' onClick={handleTap}>
                <KeyboardInput />
                <PointerLockControls onLook={(dx, dy) => lookHandlerRef.current?.(dx, dy)} />
                {children}
                {isMobile && (
                    <>
                        <div className='absolute bottom-10 left-10 z-50 text-white select-none'>
                            <Joystick horizontalAxis='horizontal' verticalAxis='vertical' />
                        </div>
                        <div className='absolute bottom-10 right-10 z-50 grid grid-cols-2 gap-4 text-white select-none'>
                            {/* twin stick */}
                            {/* <Joystick horizontalAxis='lookHorizontal' verticalAxis='lookVertical' /> */}
                            <Button button="use" />
                            <Button button="altUse" />
                            <Button button="aim" />
                            <Button button="fire" />
                            <Button button="jump" />
                        </div>
                    </>
                )}
            </div>
        </ControlsContext.Provider>
    );
}

export default Controls;
