import { FieldRenderer, useNode } from "react-three-game";
import type { Component, ComponentViewProps, FieldDefinition } from "react-three-game";
import { useFrame } from "@react-three/fiber";

const rotatorFields: FieldDefinition[] = [
    { name: 'speed', type: 'number', label: 'Rotation Speed', step: 0.1 },
    {
        name: 'axis',
        type: 'select',
        label: 'Rotation Axis',
        options: [
            { value: 'x', label: 'X' },
            { value: 'y', label: 'Y' },
            { value: 'z', label: 'Z' },
        ],
    },
];

type RotatorProperties = {
    speed?: number;
    axis?: 'x' | 'y' | 'z';
};

type RotatorComponentEditorProps = {
    component: { properties: RotatorProperties };
    onUpdate: (values: RotatorProperties) => void;
};

function RotatorComponentEditor({ component, onUpdate }: RotatorComponentEditorProps) {
    return (
        <FieldRenderer
            fields={rotatorFields}
            values={component.properties}
            onChange={onUpdate}
        />
    );
}

function RotatorView({ properties, children }: ComponentViewProps<RotatorProperties>) {
    const { editMode, getObject } = useNode();
    const speed = properties.speed ?? 1.0;
    const axis = properties.axis ?? 'y';

    useFrame((_, delta) => {
        if (editMode) return;
        const obj = getObject();

        if (obj) {
            obj.rotation[axis] += delta * speed;
            obj.updateMatrixWorld(true);
        }
    });

    return <>{children}</>;
}

const RotatorComponent: Component = {
    name: 'Rotator',
    Editor: RotatorComponentEditor,
    View: RotatorView,
    defaultProperties: {
        speed: 1.0,
        axis: 'y'
    }
};

export default RotatorComponent;
