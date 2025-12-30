"use client";

import { useMusic } from "./MusicProvider";
import Stage1 from "./stages/Stage1";
import Stage2 from "./stages/Stage2";
import Stage3 from "./stages/Stage3";
import Stage4 from "./stages/Stage4";
import BasslineEffect from "./BasslineEffect";

interface AudioVisualizerProps {
    debugStage?: number | null;
}

export default function AudioVisualizer({ debugStage = null }: AudioVisualizerProps) {
    const { audioData } = useMusic();

    const getStage = () => {
        // If debug stage is set, use it
        if (debugStage !== null) {
            switch (debugStage) {
                case 1:
                    return <Stage1 />;
                case 2:
                    return <Stage2 />;
                case 3:
                    return <Stage3 />;
                case 4:
                    return <Stage4 />;
                default:
                    return <Stage1 />;
            }
        }

        // Cycle through stages based on timestamp modulo
        const currentTime = audioData.currentTime;
        const cycleLength = 30; // Total cycle length in seconds
        const timeInCycle = currentTime % cycleLength;

        // Define stage transition timestamps within the cycle
        if (timeInCycle < 4.71) {
            return <Stage1 />;
        } else if (timeInCycle < 13.33) {
            return <Stage2 />;
        } else if (timeInCycle < 22) {
            return <Stage3 />;
        } else {
            return <Stage4 />;
        }
    };

    return (
        <>
            <BasslineEffect />
            {getStage()}
        </>
    );
}
