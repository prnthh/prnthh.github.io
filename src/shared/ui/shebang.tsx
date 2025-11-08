'use client';

import { useRef } from 'react';

interface ShebangProps {
    color?: string;
}

const Shebang = ({ color = "currentColor" }: ShebangProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
    const currentDirectionRef = useRef<boolean | null>(null);

    const animate = (forward: boolean) => {
        if (!svgRef.current) return;

        // If already animating in this direction, do nothing
        if (currentDirectionRef.current === forward) {
            return;
        }

        currentDirectionRef.current = forward;

        // Clear all pending timeouts
        timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
        timeoutsRef.current.clear();

        const animations = svgRef.current.querySelectorAll('animate, animateTransform');

        // Start animations for the new direction
        animations.forEach((anim) => {
            const element = anim as SVGAnimateElement;
            const direction = element.getAttribute('data-direction');
            const delay = element.getAttribute('data-delay');

            if (direction === (forward ? 'forward' : 'reverse')) {
                if (delay) {
                    const timeout = setTimeout(() => {
                        element.beginElement();
                        timeoutsRef.current.delete(timeout);
                    }, parseFloat(delay) * 1000);
                    timeoutsRef.current.add(timeout);
                } else {
                    element.beginElement();
                }
            }
        });
    };

    return (
        <svg
            ref={svgRef}
            viewBox="0 0 20 20"
            fill="none"
            stroke={color}
            strokeWidth="2"
            className="w-full h-full cursor-pointer p-1"
            onMouseEnter={() => animate(true)}
            onMouseLeave={() => animate(false)}
        >
            {/* Top line */}
            <line x1="3" y1="6" x2="17" y2="6" strokeLinecap="round">
                <animate attributeName="x2" from="17" to="11" dur="0.3s" fill="freeze" begin="indefinite" data-direction="forward" />
                <animate attributeName="x2" from="11" to="17" dur="0.3s" fill="freeze" begin="indefinite" data-direction="reverse" />
            </line>

            {/* Middle line */}
            <line x1="3" y1="10" x2="17" y2="10" strokeLinecap="round">
                <animate attributeName="x2" from="17" to="11" dur="0.3s" fill="freeze" begin="indefinite" data-direction="forward" />
                <animate attributeName="x2" from="11" to="17" dur="0.3s" fill="freeze" begin="indefinite" data-direction="reverse" />
            </line>

            {/* Bottom line that morphs */}
            <line x1="3" y1="14" x2="17" y2="14" strokeLinecap="round">
                {/* Pivot to vertical */}
                <animate attributeName="x2" values="17;3;3;15" keyTimes="0;0.3;0.6;1" dur="1s" fill="freeze" begin="indefinite" data-direction="forward" />
                <animate attributeName="y2" values="14;4;4;4" keyTimes="0;0.3;0.6;1" dur="1s" fill="freeze" begin="indefinite" data-direction="forward" />
                <animate attributeName="x1" values="3;3;3;15" keyTimes="0;0.3;0.6;1" dur="1s" fill="freeze" begin="indefinite" data-direction="forward" />

                {/* Reverse */}
                <animate attributeName="x1" values="15;3;3;3" keyTimes="0;0.3;0.7;1" dur="1s" fill="freeze" begin="indefinite" data-direction="reverse" />
                <animate attributeName="x2" values="15;3;3;17" keyTimes="0;0.3;0.7;1" dur="1s" fill="freeze" begin="indefinite" data-direction="reverse" />
                <animate attributeName="y2" values="4;4;4;14" keyTimes="0;0.3;0.7;1" dur="1s" fill="freeze" begin="indefinite" data-direction="reverse" />
            </line>

            {/* Hash verticals */}
            <line x1="5" y1="4" x2="5" y2="14" strokeLinecap="round" opacity="0">
                <animate attributeName="opacity" from="0" to="1" dur="0.05s" fill="freeze" begin="indefinite" data-direction="forward" data-delay="0.7" />
                <animate attributeName="opacity" from="1" to="0" dur="0.05s" fill="freeze" begin="indefinite" data-direction="reverse" />
            </line>

            <line x1="9" y1="4" x2="9" y2="14" strokeLinecap="round" opacity="0">
                <animate attributeName="opacity" from="0" to="1" dur="0.05s" fill="freeze" begin="indefinite" data-direction="forward" data-delay="0.85" />
                <animate attributeName="opacity" from="1" to="0" dur="0.05s" fill="freeze" begin="indefinite" data-direction="reverse" />
            </line>

            {/* Exclamation dot */}
            <circle cx="15" cy="13" r="1" fill={color} opacity="0">
                <animate attributeName="opacity" from="0" to="1" dur="0.05s" fill="freeze" begin="indefinite" data-direction="forward" data-delay="1" />
                <animate attributeName="opacity" from="1" to="0" dur="0.05s" fill="freeze" begin="indefinite" data-direction="reverse" />
            </circle>
        </svg>
    );
};

export default Shebang;