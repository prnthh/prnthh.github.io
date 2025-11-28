import { useHelper } from "@react-three/drei";
import { AxesHelper, Bone, Material, Object3D } from "three/webgpu";


/**
 * A helper class to visualize bone orientations in a skeleton.
 * Displays THREE.AxesHelper at each bone position showing its true orientation.
 * 
 * Usage with useHelper:
 * ```tsx
 * const meshRef = useRef();
 * useHelper(meshRef, SkeletonAxesHelper, 0.1);
 * 
 * return <primitive ref={meshRef} object={skinnedMesh} />;
 * ```
 */
class SkeletonAxesHelper extends Object3D {
    bones: Bone[];
    axesHelpers: AxesHelper[];

    constructor(object: Object3D, size = 0.05) {
        super();

        this.bones = [];
        this.axesHelpers = [];

        // Collect all bones from the object hierarchy
        object.traverse((obj) => {
            if (obj instanceof Bone) {
                this.bones.push(obj);
            }
        });

        console.log(`SkeletonAxesHelper: Found ${this.bones.length} bones`);

        // Create an axes helper for each bone
        for (let i = 0; i < this.bones.length; i++) {
            const axesHelper = new AxesHelper(size);

            if (!(axesHelper.material instanceof Material)) {
                throw new Error("Invalid material");
            }

            // Make axes render on top and transparent
            axesHelper.material.transparent = true;
            axesHelper.material.depthTest = false;
            axesHelper.matrixAutoUpdate = false;

            this.axesHelpers.push(axesHelper);
            this.add(axesHelper);
        }

        console.log(`SkeletonAxesHelper: Created ${this.axesHelpers.length} axes helpers`);
    }

    updateMatrixWorld(force?: boolean) {
        // Update each axes helper to match its corresponding bone's world matrix
        for (let i = 0; i < this.bones.length; i++) {
            const bone = this.bones[i];
            const axesHelper = this.axesHelpers[i];

            axesHelper.matrix.copy(bone.matrixWorld);
        }

        super.updateMatrixWorld(force);
    }

    dispose() {
        for (let i = 0; i < this.axesHelpers.length; i++) {
            this.axesHelpers[i].dispose();
        }
    }
}

/**
 * React component to add skeleton axes visualization to a model
 * 
 * Usage:
 * ```tsx
 * const modelRef = useRef();
 * 
 * return (
 *   <>
 *     <primitive ref={modelRef} object={skinnedMesh} />
 *     <BoneAxesHelper object={modelRef} size={0.1} />
 *   </>
 * );
 * ```
 */
interface BoneAxesHelperProps {
    object: React.RefObject<Object3D>;
    size?: number;
}

export const BoneAxesHelper: React.FC<BoneAxesHelperProps> = ({ object, size = 0.05 }) => {
    // @ts-ignore - useHelper typing issue with custom helper constructors
    useHelper(object, SkeletonAxesHelper, size);
    return null;
};

/**
 * Functional approach - adds bone axes helpers and returns cleanup function
 * 
 * Usage in useLayoutEffect:
 * ```tsx
 * useLayoutEffect(() => {
 *   if (skinnedMesh) {
 *     return addBoneAxesHelpers(skinnedMesh, 0.1);
 *   }
 * }, [skinnedMesh]);
 * ```
 */
export function addBoneAxesHelpers(root: Object3D, size = 0.05) {
    const axesHelpers: AxesHelper[] = [];
    const bones: Bone[] = [];

    // Collect all bones first to avoid recursing through helpers
    root.traverse((object) => {
        if (object instanceof Bone) {
            bones.push(object);
        }
    });

    // Add axes helper to each bone
    for (let i = 0; i < bones.length; ++i) {
        const bone = bones[i];
        const axesHelper = new AxesHelper(size);

        if (!(axesHelper.material instanceof Material)) {
            throw new Error("Invalid material");
        }

        axesHelper.material.transparent = true;
        axesHelper.material.depthTest = false;

        axesHelpers.push(axesHelper);
        bone.add(axesHelper);
    }

    // Return cleanup function
    return () => {
        for (let i = 0; i < axesHelpers.length; ++i) {
            const axesHelper = axesHelpers[i];
            axesHelper.removeFromParent();
            axesHelper.dispose();
        }
    };
}

export { SkeletonAxesHelper };
export default SkeletonAxesHelper;
