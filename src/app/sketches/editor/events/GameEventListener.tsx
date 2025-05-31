'use client';

import { useEffect, useRef } from 'react';

export type GameEventHandlers = {
    playMinigame?: () => void;
    // Add more event handlers as needed:
    // harvestPlant?: () => void;
    // buyItem?: (itemId: string) => void;
    // etc.
};

type GameEventListenerProps = {
    handlers: GameEventHandlers;
};

/**
 * A component that listens for game-wide custom events and triggers the appropriate handlers.
 * This serves as a communication channel between different components that can't directly interact.
 */
const GameEventListener = ({ handlers }: GameEventListenerProps) => {
    // Use a ref to keep the latest handlers without causing effect to re-run
    const handlersRef = useRef<GameEventHandlers>(handlers);

    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    useEffect(() => {
        // Handler for AI triggered spin wheel
        const handleAISpinTrigger = () => {
            console.log('AI triggered spin wheel event received');
            if (handlersRef.current.playMinigame) {
                handlersRef.current.playMinigame();
            }
        };

        // Add all event listeners
        window.addEventListener('ai-trigger-play-minigame', handleAISpinTrigger);

        return () => {
            window.removeEventListener('ai-trigger-play-minigame', handleAISpinTrigger);
        };
    }, []);

    return null;
};

export default GameEventListener;
