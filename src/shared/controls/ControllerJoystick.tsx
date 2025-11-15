/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license found in the LICENSE
 * file in the root directory of this source tree.
 */

import React, { useRef, useState, useEffect } from 'react';
import { useInputStore } from '@/shared/providers/InputStore';

type JoystickProps = {
    horizontalAxis?: 'horizontal' | 'lookHorizontal';
    verticalAxis?: 'vertical' | 'lookVertical';
    onMove?: (pos: { x: number; y: number }) => void;
};

const size = 100;
const radius = size / 2;
const knobRadius = 30;
const RUN_THRESHOLD = 0.6; // Threshold for running (60% stick push)

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

const ControllerJoystick: React.FC<JoystickProps> = ({
    horizontalAxis = 'horizontal',
    verticalAxis = 'vertical',
    onMove
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const dragging = useRef(false);
    const activeTouchId = useRef<number | null>(null);
    const setAxis = useInputStore(state => state.setAxis);
    const setButton = useInputStore(state => state.setButton);

    // Update joystick values in store
    useEffect(() => {
        const normalizedX = clamp(knob.x / (radius - knobRadius / 2), -1, 1);
        const normalizedY = clamp(knob.y / (radius - knobRadius / 2), -1, 1);

        setAxis(horizontalAxis, normalizedX);
        setAxis(verticalAxis, -normalizedY); // Invert Y so up is positive

        // Only set sprint for movement joystick (not look joystick)
        if (horizontalAxis === 'horizontal' && verticalAxis === 'vertical') {
            const magnitude = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
            const shouldSprint = magnitude > RUN_THRESHOLD;
            setButton('sprint', shouldSprint);
        }

        if (onMove) {
            onMove({ x: normalizedX, y: -normalizedY });
        }
    }, [knob.x, knob.y, horizontalAxis, verticalAxis, setAxis, setButton, onMove]);

    // Helper to update knob and call onMove
    const updateKnobFromCoords = (clientX: number, clientY: number) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const pos = getRelativePosition(clientX, clientY, rect);
        setKnob(pos);
    };

    // Only start joystick drag if touch starts on joystick area and not already dragging
    const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
        if ('touches' in e) {
            if (e.touches.length === 0) return;
            // Only start if not already dragging
            if (!dragging.current) {
                // Find the touch that started on the joystick area
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                let found = false;
                for (let i = 0; i < e.touches.length; i++) {
                    const t = e.touches[i];
                    const x = t.clientX - rect.left;
                    const y = t.clientY - rect.top;
                    if (x >= 0 && x <= size && y >= 0 && y <= size) {
                        e.preventDefault();
                        dragging.current = true;
                        activeTouchId.current = t.identifier;
                        updateKnobFromCoords(t.clientX, t.clientY);
                        found = true;
                        break;
                    }
                }
                if (!found) return;
            }
        } else {
            dragging.current = true;
            updateKnobFromCoords((e as React.MouseEvent).clientX, (e as React.MouseEvent).clientY);
        }
    };

    // Only track the active touch for joystick
    const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
        if ('touches' in e) {
            if (!dragging.current || activeTouchId.current === null) return;
            e.preventDefault();
            // Only track the active touch
            const touch = Array.from(e.touches).find(
                t => t.identifier === activeTouchId.current
            );
            if (!touch) return;
            updateKnobFromCoords(touch.clientX, touch.clientY);
        } else {
            if (!dragging.current) return;
            updateKnobFromCoords((e as React.MouseEvent).clientX, (e as React.MouseEvent).clientY);
        }
    };

    // On touchend/touchcancel, only end if the released touch is the one tracked by joystick
    const handleEnd = (e?: React.TouchEvent | React.MouseEvent) => {
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
                // Listen to mousemove/mouseup on document so we catch releases outside the joystick
                const moveListener = handleMove as any;
                const upListener = () => {
                    handleEnd();
                    document.removeEventListener('mousemove', moveListener);
                    document.removeEventListener('mouseup', upListener);
                };
                document.addEventListener('mousemove', moveListener);
                document.addEventListener('mouseup', upListener, { once: true });
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

export default ControllerJoystick;
