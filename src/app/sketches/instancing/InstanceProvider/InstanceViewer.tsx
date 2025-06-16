import { Canvas } from "@react-three/fiber";
import { InstancedMeshProvider, useInstanceMeshes } from "./InstancedMeshProvider";
import { Bvh } from "@react-three/drei";

export type InstanceData = {
    position: [number, number, number];
    rotation: [number, number, number];
    meshPath: string;
};

interface InstanceProps {
    data: InstanceData[];
}

export function InstanceView({ data }: InstanceProps) {
    const instances = useInstanceMeshes();
    const meshNames = Object.keys(instances);

    return (
        <>
            {data.map((props, i) => {
                // Use meshPath as the key and identifier
                const meshPath = props.meshPath;
                // Find mesh instance(s) whose name includes the meshPath (or is equal)
                const meshNamesToUse = meshNames.filter((n) =>
                    typeof n === 'string' && meshPath && n.includes(meshPath)
                );
                return (
                    <group key={meshPath + '-' + i} position={props.position} rotation={props.rotation}>
                        {meshNamesToUse.map((name) => {
                            const Instance = instances[name];
                            return (
                                <Instance
                                    key={name}
                                    scale={[1, 1, 1]}
                                />
                            );
                        })}
                    </group>
                );
            })}
        </>
    );
}

export default function InstanceViewer({ data }: { data: InstanceData[] }) {
    // Collect unique mesh options from data
    const meshOptions = Array.from(
        new Map(
            data.map(d => [d.meshPath, { name: d.meshPath, path: d.meshPath }])
        ).values()
    );
    return (

        <InstancedMeshProvider meshOptions={meshOptions}>
            <Bvh firstHitOnly>
                <InstanceView data={data} />
            </Bvh>
        </InstancedMeshProvider>
    )
}