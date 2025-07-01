import * as THREE from 'three';
import { uniform } from 'three/tsl';
import { Node, NodeFrame, NodeUpdateType } from 'three/webgpu';

class OcclusionNode extends Node {

    uniformNode: any;
    testObject: THREE.Object3D;
    normalColor: THREE.Color;
    occludedColor: THREE.Color;

    constructor(testObject: THREE.Object3D, normalColor: THREE.Color, occludedColor: THREE.Color) {

        super('vec3');

        this.updateType = NodeUpdateType.OBJECT;

        this.uniformNode = uniform(new THREE.Color());

        this.testObject = testObject;
        this.normalColor = normalColor;
        this.occludedColor = occludedColor;

    }

    async update(frame: NodeFrame) {

        const isOccluded = frame.renderer?.isOccluded
            ? frame.renderer.isOccluded(this.testObject)
            : false;

        this.uniformNode.value.copy(isOccluded ? this.occludedColor : this.normalColor);

    }

    setup( /* builder */) {

        return this.uniformNode;

    }

}

export default OcclusionNode;
