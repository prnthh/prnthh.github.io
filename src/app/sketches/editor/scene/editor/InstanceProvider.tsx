import { Bvh } from "@react-three/drei";
import { InstanceData, InstancedMeshProvider, InstanceView } from "./InstanceMesher";


export function InstanceViewer({ data }: { data: InstanceData[] }) {
    // Collect unique mesh options from data
    const meshOptions = Array.from(
        new Map(
            data.map(d => [d.meshPath, { name: d.meshPath, path: d.meshPath }])
        ).values()
    );

    console.log(meshOptions)
    return (

        <InstancedMeshProvider meshOptions={meshOptions}>
            <Bvh firstHitOnly>
                <InstanceView data={data} />
            </Bvh>
        </InstancedMeshProvider>
    )
}


export default function InstanceProvider() {
    return (
        <>
            <InstanceViewer data={[
                {
                    position: [2, 0, 0],
                    rotation: [0, 0, 0],
                    meshPath: '/models/environment/tree.glb',
                },
                {
                    position: [6, 0, 0],
                    rotation: [0, 0, 0],
                    meshPath: '/models/environment/tree.glb',
                },
                {
                    position: [4, 0, 0],
                    rotation: [0, 0, 0],
                    meshPath: '/models/environment/shoe.glb',
                }
            ]} />
        </>
    )
}
