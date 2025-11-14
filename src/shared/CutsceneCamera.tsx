import { forwardRef, useRef, useImperativeHandle } from "react";
import { SceneCamera } from "./SceneCamera";

const CutsceneCamera = forwardRef((props, ref) => {
    const sceneCameraRef = useRef<any>(null);

    // Forward the ref to expose the camera
    useImperativeHandle(ref, () => sceneCameraRef.current);

    return <SceneCamera ref={sceneCameraRef} />;
});

export default CutsceneCamera;