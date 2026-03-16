import { CylinderCollider } from "@react-three/rapier";
import React, { useEffect, useState } from "react";
import { Html } from "@react-three/drei";

export default function DialogCollider({
    children,
    label,
    height = 1.4,
    radius = 1.5,
    onEnter,
    onExit
}: {
    children?: React.ReactNode,
    label?: React.ReactNode,
    height?: number,
    radius?: number,
    onEnter?: () => void,
    onExit?: () => void
}) {
    const [dialogVisible, setDialogVisible] = useState(false);

    const isPlayer = (event: any) => {
        const name = event?.other?.rigidBodyObject?.name;
        return name === 'bob';
    };

    const handleIntersectionEnter = (event: any) => {
        if (!isPlayer(event)) return;
        setDialogVisible(true);
        onEnter?.();
    };

    const handleIntersectionExit = (event: any) => {
        if (!isPlayer(event)) return;
        setDialogVisible(false);
        onExit?.();
    };

    return <>
        <CylinderCollider
            args={[height / 2, radius]}
            position={[0, (height / 2), 0]}
            sensor
            onIntersectionEnter={handleIntersectionEnter}
            onIntersectionExit={handleIntersectionExit}
        />
        {dialogVisible && children}
        {dialogVisible && <Html sprite transform position={[0, height * 1.1, 0]} scale={0.4}>
            <div className="select-none max-w-[250px] hover:text-yellow-500 font-serif p-1 text text-yellow-300 text-center bg-black-800/20 rounded">
                {label || "Default Dialog Text"}
            </div>
        </Html>}
    </>
}


const RevealTextByWord = ({ text, speed = 100, playSound }: { text: string, speed?: number, playSound?: (url: string) => void }) => {
    const words = text.split(" ");
    const [wordCount, setWordCount] = useState(0);

    useEffect(() => {
        setWordCount(0);
        if (!words.length) return;
        let cancelled = false;
        let i = 0;
        function showNextWord() {
            if (cancelled || i >= words.length) return;
            setWordCount(i + 1);
            playSound?.("/sound/click.mp3");

            let delay = speed;
            if (/[,.;:!?]$/.test(words[i])) delay = speed * 2;
            i++;
            if (i < words.length) {
                setTimeout(showNextWord, delay);
            }
        }
        showNextWord();
        return () => { cancelled = true; };
    }, [text, speed]);

    return (
        <div>
            {words.map((word, i) => (
                <span
                    key={i}
                    style={{
                        display: "inline-block",
                        transition: "transform 0.4s cubic-bezier(.5,1.5,.5,1)",
                        transform: i < wordCount ? "translateY(0)" : "translateY(-1em)",
                        opacity: i < wordCount ? 1 : 0,
                        marginRight: "0.25em"
                    }}
                >
                    {word}
                </span>
            ))}
        </div>
    );
}

export { RevealTextByWord };