/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license found in the LICENSE
 * file in the root directory of this source tree.
 */

import React, { useRef, useState, useEffect } from 'react';

type JoystickProps = {
    controlScheme: string;
    onMove?: (pos: { x: number; y: number }) => void;
};

const size = 100;
const radius = size / 2;
const knobRadius = 30;

const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

const getRelativePosition = (
    clientX: number,
    clientY: number,
    rect: DOMRect
) => {
    const x = clientX - rect.left - radius;
    const y = clientY - rect.top - radius;
    // Clamp to circle
    const dist = Math.sqrt(x * x + y * y);
    if (dist > radius - knobRadius / 2) {
        const angle = Math.atan2(y, x);
        return {
            x: Math.cos(angle) * (radius - knobRadius / 2),
            y: Math.sin(angle) * (radius - knobRadius / 2),
        };
    }
    return { x, y };
};

const keyMap = [
    { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
    { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
    { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
    { name: 'right', keys: ['ArrowRight', 'KeyD'] },
];

function triggerKey(name: string, type: 'keydown' | 'keyup') {
    const entry = keyMap.find(k => k.name === name);
    if (!entry) return;
    for (const key of entry.keys) {
        const event = new KeyboardEvent(type, { code: key, key: key.replace('Key', ''), bubbles: true });
        window.dispatchEvent(event);
    }
}

const Joystick: React.FC<JoystickProps> = ({ controlScheme, onMove }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const dragging = useRef(false);
    const lastDirections = useRef<{ [k: string]: boolean }>({});
    const activeTouchId = useRef<number | null>(null); // Track active touch

    // Helper to determine direction from x/y
    const getDirections = (x: number, y: number) => {
        const threshold = 0.3;
        return {
            forward: y < -threshold,
            backward: y > threshold,
            left: x < -threshold,
            right: x > threshold,
        };
    };

    // Fire key events based on joystick movement
    useEffect(() => {
        const { x, y } = knob;
        const dirs = getDirections(x / (radius - knobRadius / 2), y / (radius - knobRadius / 2));
        for (const dir of Object.keys(dirs) as (keyof typeof dirs)[]) {
            if (dirs[dir] && !lastDirections.current[dir]) {
                triggerKey(dir, 'keydown');
            }
            if (!dirs[dir] && lastDirections.current[dir]) {
                triggerKey(dir, 'keyup');
            }
        }
        lastDirections.current = dirs;
        // Cleanup on unmount: release all keys
        return () => {
            for (const dir of Object.keys(lastDirections.current)) {
                if (lastDirections.current[dir]) {
                    triggerKey(dir, 'keyup');
                }
            }
            lastDirections.current = {};
        };
    }, [knob.x, knob.y]);

    const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
        if ('touches' in e) {
            if (e.touches.length === 0) return;
            // Only start if not already dragging
            if (!dragging.current) {
                dragging.current = true;
                activeTouchId.current = e.touches[0].identifier;
                handleMove(e);
            }
        } else {
            dragging.current = true;
            handleMove(e);
        }
    };

    const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
        if ('touches' in e) {
            if (!dragging.current || activeTouchId.current === null) return;
            // Only track the active touch
            const touch = Array.from(e.touches).find(
                t => t.identifier === activeTouchId.current
            );
            if (!touch) return;
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const pos = getRelativePosition(touch.clientX, touch.clientY, rect);
            setKnob(pos);
            if (onMove) {
                onMove({
                    x: clamp(pos.x / (radius - knobRadius / 2), -1, 1),
                    y: clamp(pos.y / (radius - knobRadius / 2), -1, 1),
                });
            }
        } else {
            if (!dragging.current) return;
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const pos = getRelativePosition(e.clientX, e.clientY, rect);
            setKnob(pos);
            if (onMove) {
                onMove({
                    x: clamp(pos.x / (radius - knobRadius / 2), -1, 1),
                    y: clamp(pos.y / (radius - knobRadius / 2), -1, 1),
                });
            }
        }
    };

    const handleEnd = (e?: React.TouchEvent | React.MouseEvent) => {
        // Only end if the active touch is released (for touch events)
        if (e && 'changedTouches' in e) {
            if (activeTouchId.current === null) return;
            const ended = Array.from(e.changedTouches).some(
                t => t.identifier === activeTouchId.current
            );
            if (!ended) return;
        }
        dragging.current = false;
        activeTouchId.current = null;
        setKnob({ x: 0, y: 0 });
        if (onMove) onMove({ x: 0, y: 0 });
        // Release all keys on joystick release
        for (const dir of Object.keys(lastDirections.current)) {
            if (lastDirections.current[dir]) {
                triggerKey(dir, 'keyup');
            }
        }
        lastDirections.current = {};
    };

    return (
        <div
            ref={containerRef}
            style={{
                width: size,
                height: size,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                border: '2px solid white',
                touchAction: 'none',
                position: 'relative',
                userSelect: 'none',
            }}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            onTouchCancel={handleEnd}
            onMouseDown={e => {
                e.preventDefault();
                handleStart(e);
                // Only listen to mousemove/mouseup on the joystick area
                const div = containerRef.current;
                if (!div) return;
                const moveListener = handleMove as any;
                const upListener = () => {
                    handleEnd();
                    div.removeEventListener('mousemove', moveListener);
                    div.removeEventListener('mouseup', upListener);
                };
                div.addEventListener('mousemove', moveListener);
                div.addEventListener('mouseup', upListener, { once: true });
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    left: radius + knob.x - knobRadius / 2,
                    top: radius + knob.y - knobRadius / 2,
                    width: knobRadius,
                    height: knobRadius,
                    background: 'rgba(255,255,255,0.7)',
                    borderRadius: '50%',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    touchAction: 'none',
                    pointerEvents: 'none',
                }}
            />
        </div>
    );
};

export default Joystick;
