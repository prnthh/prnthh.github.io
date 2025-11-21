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
    };
}