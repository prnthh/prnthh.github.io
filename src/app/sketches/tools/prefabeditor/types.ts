import { ThreeElements } from "@react-three/fiber"

export interface Prefab {
    id: string;
    name: string;
    description?: string;
    author?: string;
    version?: string;
    assets?: string[] | {[assetName: string]: string}; // List of asset URLs or a mapping of asset names to URLs
    onStart?: (target: any) => void; // The logic function to run when the map starts
    root: GameObject; // The root node of the scene graph
}

export interface GameObject {
    id: string;
    enabled: boolean;
    visible: boolean;
    ref?: any;
    children?: GameObject[];
    components?: { 
        transform?: TransformComponent;
        geometry?: GeometryComponent;
        material?: MaterialComponent;
        model?: ModelComponent;
        physics?: PhysicsComponent;
        state?: StateComponent;
        spotLight?: SpotLightComponent;
        [uuid: string]: Component | undefined;
    };
}

interface Component {
    type: string;
    properties: { [key: string]: any };
}

interface TransformComponent extends Component {
    type: "Transform";
    properties: {
        position: [number, number, number];
        rotation: [number, number, number];
        scale: [number, number, number];
    };
}

interface GeometryComponent extends Component {
    type: "Geometry";
    properties: {
        geometryType: "box" | "sphere" | "plane";
        args?: number[];
    };
} 

interface MaterialComponent extends Component {
    type: "Material";
    properties: {
        color: string;
        wireframe?: boolean;
        texture?: string;
        repeat?: boolean;
        repeatCount?: [number, number];
    };
}

interface PhysicsComponent extends Component {
    type: "Physics";
    properties: {
        type: "dynamic" | "fixed";
    };
}

interface StateComponent extends Component {
    type: "State";
    properties: {
        [key: string]: any;
    };
}

export interface ModelComponent extends Component {
    type: "Model";
    properties: {
        filename: string;
        instanced?: boolean;
    };
}

export interface SpotLightComponent extends Component {
    type: "SpotLight";
    properties: {
        color: string;
        intensity: number;
    };
}


export const COMPONENT_DEFS: Record<string, { type: string, defaultProps: any }> = {
    transform: { type: 'Transform', defaultProps: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } },
    geometry: { type: 'Geometry', defaultProps: { geometryType: 'box' } },
    material: { type: 'Material', defaultProps: { color: '#ffffff' } },
    model: { type: 'Model', defaultProps: { filename: '' } },
    physics: { type: 'Physics', defaultProps: { type: 'dynamic' } },
    spotLight: { type: 'SpotLight', defaultProps: { color: '#ffffff', intensity: 1 } }
};