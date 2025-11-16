import { MapControls, PerspectiveCamera } from "@react-three/drei"

const DebugCamera = () => {
    return <>
        <MapControls makeDefault enableDamping={false} />
        <PerspectiveCamera makeDefault position={[0, 10, 10]} name="player" />
    </>
}

export default DebugCamera;