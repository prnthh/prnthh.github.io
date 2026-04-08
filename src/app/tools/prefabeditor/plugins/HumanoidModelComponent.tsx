import AnimatedModel from "@/app/react-three-character/HumanoidModel";
import { FieldGroup, FieldRenderer, Label, ModelPicker, StringInput, type Component, type FieldDefinition } from "react-three-game";

type AnimationOverrideItem = {
    name: string;
    path: string;
};

type HumanoidModelProperties = {
    name?: string;
    basePath?: string;
    model?: string;
    animation?: string;
    animationOverridesList?: AnimationOverrideItem[];
    idleAnimation?: string;
    walkAnimation?: string;
    runAnimation?: string;
    height?: number;
    scale?: number;
    rotation?: [number, number, number];
    modelOffset?: [number, number, number];
    shadowOnly?: boolean;
    debug?: boolean;
};

const DEFAULT_PROPERTIES: Required<Omit<HumanoidModelProperties, "name">> & Pick<HumanoidModelProperties, "name"> = {
    name: "",
    basePath: "/models/human/onimilio/",
    model: "rigged.glb",
    animation: "idle",
    animationOverridesList: [
        { name: "idle", path: "anim/idle.fbx" },
        { name: "walk", path: "anim/walk.fbx" },
        { name: "run", path: "anim/run.fbx" },
    ],
    idleAnimation: "anim/idle.fbx",
    walkAnimation: "anim/walk.fbx",
    runAnimation: "anim/run.fbx",
    height: 1,
    scale: 1,
    rotation: [0, 0, 0],
    modelOffset: [0, 0, 0],
    shadowOnly: false,
    debug: false,
};

function normalizeBasePath(basePath?: string) {
    const value = basePath?.trim();
    if (!value) {
        return "";
    }

    return value.replace(/\/?$/, "/");
}

function toPickerValue(model: string | undefined, modelBasePath?: string) {
    const value = model?.trim();
    if (!value) {
        return undefined;
    }

    if (value.startsWith("/")) {
        return value.slice(1);
    }

    return `${normalizeBasePath(modelBasePath)}${value.replace(/^\/+/, "")}`.replace(/^\/+/, "");
}

function fromPickerValue(selectedFile: string | undefined, modelBasePath?: string) {
    if (!selectedFile) {
        return undefined;
    }

    const normalizedSelection = selectedFile.startsWith("/") ? selectedFile : `/${selectedFile}`;
    const normalizedModelBasePath = normalizeBasePath(modelBasePath);

    if (normalizedModelBasePath && normalizedSelection.startsWith(normalizedModelBasePath)) {
        return normalizedSelection.slice(normalizedModelBasePath.length);
    }

    return normalizedSelection;
}

function getAnimationOverridesList(properties: HumanoidModelProperties): AnimationOverrideItem[] {
    if (Array.isArray(properties.animationOverridesList)) {
        return properties.animationOverridesList.map((item) => ({
            name: item?.name ?? "",
            path: item?.path ?? "",
        }));
    }

    return [
        { name: "idle", path: properties.idleAnimation ?? DEFAULT_PROPERTIES.idleAnimation },
        { name: "walk", path: properties.walkAnimation ?? DEFAULT_PROPERTIES.walkAnimation },
        { name: "run", path: properties.runAnimation ?? DEFAULT_PROPERTIES.runAnimation },
    ];
}

function AnimationOverridesListEditor({
    value,
    onChange,
}: {
    value: AnimationOverrideItem[];
    onChange: (nextValue: AnimationOverrideItem[]) => void;
}) {
    const updateItem = (index: number, patch: Partial<AnimationOverrideItem>) => {
        onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    };

    const removeItem = (index: number) => {
        onChange(value.filter((_, itemIndex) => itemIndex !== index));
    };

    const addItem = () => {
        onChange([...value, { name: "", path: "" }]);
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <Label>Animation FBX Paths</Label>
                <button
                    type="button"
                    onClick={addItem}
                    className="h-[22px] w-[22px] cursor-pointer rounded-[3px] border border-cyan-400/30 bg-cyan-400/10 p-0 text-sm leading-none text-cyan-200"
                    title="Add animation override"
                >
                    +
                </button>
            </div>

            {value.map((item, index) => (
                <div
                    key={`${item.name || "animation"}-${index}`}
                    className="flex gap-1.5 rounded border border-white/12 bg-white/3 p-2"
                >
                    <div className="flex flex-1 items-end gap-1.5">
                        <div className="flex-1">
                            <StringInput
                                label="Animation"
                                value={item.name}
                                onChange={(nextName) => updateItem(index, { name: nextName })}
                                placeholder="idle"
                            />
                        </div>

                    </div>
                    <StringInput
                        label="FBX Path"
                        value={item.path}
                        onChange={(nextPath) => updateItem(index, { path: nextPath })}
                        placeholder="anim/idle.fbx"
                    />
                    <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="h-6 w-7 shrink-0 cursor-pointer rounded-[3px] border border-white/12 bg-gray-800 p-0 text-inherit"
                        title="Remove animation override"
                    >
                        x
                    </button>
                </div>
            ))}
        </div>
    );
}

const humanoidModelFields: FieldDefinition[] = [
    { name: "name", type: "string", label: "Name", placeholder: "npc-01" },
    { name: "basePath", type: "string", label: "Base Path", placeholder: "/models/human/onimilio/" },
    {
        name: "model",
        type: "custom",
        label: "Model Path",
        render: () => null,
    },
    { name: "animation", type: "string", label: "Animation", placeholder: "idle" },
    {
        name: "animationOverridesList",
        type: "custom",
        label: "Animation FBX Paths",
        render: () => null,
    },
    { name: "height", type: "number", label: "Height", min: 0.1, step: 0.1 },
    { name: "scale", type: "number", label: "Scale", min: 0.01, step: 0.1 },
    { name: "rotation", type: "vector3", label: "Model Rotation", snap: 0.01 },
    { name: "modelOffset", type: "vector3", label: "Model Offset", snap: 0.01 },
    { name: "shadowOnly", type: "boolean", label: "Shadow Only" },
    { name: "debug", type: "boolean", label: "Debug" },
];

function buildAnimationOverrides(properties: HumanoidModelProperties): Record<string, string> | undefined {
    const overrides = getAnimationOverridesList(properties).reduce<Record<string, string>>((result, item) => {
        const trimmedName = item.name.trim();
        const trimmedPath = item.path.trim();

        if (trimmedName && trimmedPath) {
            result[trimmedName] = trimmedPath;
        }

        return result;
    }, {});

    return Object.keys(overrides).length > 0 ? overrides : undefined;
}

function HumanoidModelComponentEditor({
    component,
    node,
    onUpdate,
    basePath,
}: {
    component: { properties: HumanoidModelProperties };
    node?: { id?: string };
    onUpdate: (newComp: HumanoidModelProperties) => void;
    basePath?: string;
}) {
    const values = {
        ...DEFAULT_PROPERTIES,
        ...component.properties,
        animationOverridesList: getAnimationOverridesList(component.properties),
    };
    const fields = humanoidModelFields.map((field) => {
        if (field.type !== "custom") {
            return field;
        }

        if (field.name === "model") {
            return {
                ...field,
                render: ({ value, values: currentValues, onChange, onChangeMultiple }) => (
                    <ModelPicker
                        value={toPickerValue(typeof value === "string" ? value : undefined, typeof currentValues.basePath === "string" ? currentValues.basePath : undefined)}
                        basePath={basePath}
                        pickerKey={node?.id}
                        onChange={(nextValue) => {
                            const storedValue = fromPickerValue(nextValue, typeof currentValues.basePath === "string" ? currentValues.basePath : undefined);
                            onChange(storedValue);
                            onChangeMultiple({ model: storedValue });
                        }}
                    />
                ),
            } satisfies FieldDefinition;
        }

        return {
            ...field,
            render: ({ value, onChange, onChangeMultiple }) => (
                <AnimationOverridesListEditor
                    value={Array.isArray(value) ? value as AnimationOverrideItem[] : []}
                    onChange={(nextValue) => {
                        onChange(nextValue);
                        onChangeMultiple({
                            animationOverridesList: nextValue,
                            idleAnimation: undefined,
                            walkAnimation: undefined,
                            runAnimation: undefined,
                        });
                    }}
                />
            ),
        } satisfies FieldDefinition;
    });

    return (
        <FieldGroup>
            <FieldRenderer
                fields={fields}
                values={values}
                onChange={onUpdate}
            />
        </FieldGroup>
    );
}

function HumanoidModelView({ properties, children }: { properties: HumanoidModelProperties; children?: React.ReactNode }) {
    const mergedProperties = { ...DEFAULT_PROPERTIES, ...properties };

    return (
        <AnimatedModel
            name={mergedProperties.name || undefined}
            basePath={mergedProperties.basePath}
            model={mergedProperties.model}
            animation={mergedProperties.animation || "idle"}
            animationOverrides={buildAnimationOverrides(mergedProperties)}
            height={mergedProperties.height}
            scale={mergedProperties.scale}
            rotation={mergedProperties.rotation}
            modelOffset={mergedProperties.modelOffset}
            shadowOnly={mergedProperties.shadowOnly}
            debug={mergedProperties.debug}
        >
            {children}
        </AnimatedModel>
    );
}

const HumanoidModelComponent: Component = {
    name: "HumanoidModel",
    Editor: HumanoidModelComponentEditor,
    View: HumanoidModelView,
    defaultProperties: DEFAULT_PROPERTIES,
};

export default HumanoidModelComponent;