import { Preload } from "@react-three/drei";
import { useEffect, useState } from "react";
import Vehicle from "./car/base";
import DialogCollider from "@/app/react-three-controller/ped/physics/DialogCollider";

const DrivableCar = ({ position = [2, 5, 4], setPlayerState, name }: {
    position?: [number, number, number],
    setPlayerState?: (state: string | undefined) => void
    name?: string
}) => {
    const [canEnter, setCanEnter] = useState(false);
    const [isDriving, setIsDriving] = useState(false);

    // Listen for 'e' to enter only when canEnter && !isDriving
    useEffect(() => {
        let handler: ((event: KeyboardEvent) => void) | null = null;
        if (canEnter && !isDriving) {
            handler = (event: KeyboardEvent) => {
                if (event.key === 'e') setIsDriving(true);
            };
        } else if (isDriving) {
            handler = (event: KeyboardEvent) => {
                if (event.key === 'e') {
                    setIsDriving(false);
                    setCanEnter(false); // Prevent immediate re-entry after exit
                }
            };
        }
        if (handler) window.addEventListener('keydown', handler);
        return () => {
            if (handler) window.removeEventListener('keydown', handler);
        };
    }, [canEnter, isDriving]);

    useEffect(() => {
        setPlayerState?.(isDriving ? name : undefined);
    }, [isDriving, name]);

    return <><Preload all />
        <Vehicle
            name={name || "drivable-car"}
            spawn={{
                position: position || [2, 0, 4],
                rotation: [0, Math.PI / 2, 0]
            }}
            driving={isDriving}
            chassisModel="/models/cars/taxi/chassis.glb"
            wheelModel="/models/cars/taxi/wheel.glb"
        >
            {!isDriving && <DialogCollider height={1} radius={2}
                onEnter={() => setCanEnter(true)} onExit={() => setCanEnter(false)}
            >
                <button onClick={() => setIsDriving(true)} className="bg-yellow-300 text-black p-2 rounded text-sm w-[600px]]">
                    press e to enter
                </button>
            </DialogCollider>
            }
        </Vehicle>
    </>
}

export default DrivableCar;