import type { Prefab } from "react-three-game";

export type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    trace?: string;
};

export type ResponseOutputItem = {
    type?: string;
    name?: string;
    arguments?: string;
    call_id?: string;
    id?: string;
    content?: Array<{
        type?: string;
        text?: string;
    }>;
};

export type ResponseEnvelope = {
    id?: string;
    output?: ResponseOutputItem[];
    output_text?: string;
};

type StreamingResponseEvent = {
    type?: string;
    delta?: string;
    text?: string;
    response?: ResponseEnvelope;
};

export type ToolResult = {
    ok: boolean;
    message?: string;
    [key: string]: unknown;
};

type PrefabNode = {
    id: string;
    name?: string;
    enabled?: boolean;
    components?: Record<string, { type: string; properties?: Record<string, unknown> }>;
    children?: PrefabNode[];
};

let textureManifestCache: string[] | null = null;
let modelManifestCache: string[] | null = null;

export const STORAGE_KEYS = {
    apiKey: "prefab-editor.agent.api-key",
    baseUrl: "prefab-editor.agent.base-url",
    model: "prefab-editor.agent.model",
};

export const DEFAULT_BASE_URL = "https://api.openai.com/v1";
export const MAX_AGENT_STEPS = 8;

const AUTHORING_RULES = [
    "Primitive -> create_primitive(name, geometryType, color, optional args/transform).",
    "Custom mesh -> create_buffer_mesh(name, positions, optional indices/normals/uvs, color, optional transform).",
    "Textured mesh -> search_texture_manifest(query), then create_primitive or update material.texture with the returned path.",
    "Existing model -> search_model_manifest(query), then create_model_node(name, filename, optional transform).",
    "Raw prefab shape -> create_node({ components: { geometry: { type: 'Geometry', properties: { geometryType, args } }, material: { type: 'Material', properties: { color } } } }).",
    "Red box -> create_primitive({ name: 'Red Box', geometryType: 'box', args: [1, 1, 1], color: '#ff0000' }).",
    "Textured box -> search_texture_manifest('crate'), then create_primitive(...), then update_component_properties on Material with { texture: '/textures/...' }.",
    "Load tree model -> search_model_manifest('tree'), then create_model_node({ name: 'Tree', filename: '/models/environment/tree.glb' }).",
    "Blue sphere -> create_primitive({ name: 'Blue Sphere', geometryType: 'sphere', color: '#0000ff' }).",
    "Triangle mesh -> create_buffer_mesh({ name: 'Triangle', positions: [0,0,0, 1,0,0, 0,1,0], indices: [0,1,2], color: '#ff8844' }).",
    "Use CURRENT_PREFAB_SUMMARY as current state and do only the next needed tool call.",
    "Keep reasoning compact and move straight to the remaining work, then answer.",
] as const;

export const TOOL_DEFINITIONS = [
    {
        type: "function",
        name: "get_prefab_summary",
        description: "Return a compact summary of the current prefab tree, including ids, names, component types, and child hierarchy.",
        parameters: { type: "object", properties: {}, additionalProperties: false },
    },
    {
        type: "function",
        name: "get_prefab_json",
        description: "Return the full current prefab JSON. Use this only when the summary is insufficient.",
        parameters: { type: "object", properties: {}, additionalProperties: false },
    },
    {
        type: "function",
        name: "get_texture_manifest",
        description: "Return the texture manifest paths. Use this when you need the full texture list.",
        parameters: { type: "object", properties: {}, additionalProperties: false },
    },
    {
        type: "function",
        name: "search_texture_manifest",
        description: "Search texture manifest paths by text query and return matching texture paths.",
        parameters: {
            type: "object",
            properties: { query: { type: "string" }, limit: { type: "number" } },
            required: ["query"],
            additionalProperties: false,
        },
    },
    {
        type: "function",
        name: "get_model_manifest",
        description: "Return the model manifest paths. Use this when you need the full model list.",
        parameters: { type: "object", properties: {}, additionalProperties: false },
    },
    {
        type: "function",
        name: "search_model_manifest",
        description: "Search model manifest paths by text query and return matching model paths.",
        parameters: {
            type: "object",
            properties: { query: { type: "string" }, limit: { type: "number" } },
            required: ["query"],
            additionalProperties: false,
        },
    },
    {
        type: "function",
        name: "set_node_transform",
        description: "Update Transform properties on a node. Creates a Transform component if needed.",
        parameters: {
            type: "object",
            properties: {
                nodeId: { type: "string", description: "Target node id." },
                position: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
                rotation: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
                scale: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
            },
            required: ["nodeId"],
            additionalProperties: false,
        },
    },
    {
        type: "function",
        name: "update_component_properties",
        description: "Merge or replace component properties on a node. Adds the component if missing.",
        parameters: {
            type: "object",
            properties: {
                nodeId: { type: "string" },
                componentName: { type: "string", description: "Component type name such as Transform, Geometry, Material, Rotator, or HumanoidModel." },
                properties: { type: "object", additionalProperties: true },
                replace: { type: "boolean" },
            },
            required: ["nodeId", "componentName", "properties"],
            additionalProperties: false,
        },
    },
    {
        type: "function",
        name: "add_component",
        description: "Add a new component to an existing node.",
        parameters: {
            type: "object",
            properties: {
                nodeId: { type: "string" },
                componentName: { type: "string" },
                properties: { type: "object", additionalProperties: true },
            },
            required: ["nodeId", "componentName"],
            additionalProperties: false,
        },
    },
    {
        type: "function",
        name: "remove_component",
        description: "Remove a component from a node by component type name.",
        parameters: {
            type: "object",
            properties: { nodeId: { type: "string" }, componentName: { type: "string" } },
            required: ["nodeId", "componentName"],
            additionalProperties: false,
        },
    },
    {
        type: "function",
        name: "create_primitive",
        description: "Create a single primitive mesh node with Transform + Geometry + Material on the same node. Use this for requests like 'red box' or 'blue sphere'.",
        parameters: {
            type: "object",
            properties: {
                name: { type: "string", description: "Descriptive node name such as 'Red Box'." },
                parentId: { type: "string", description: "Parent node id. Defaults to the scene root." },
                geometryType: { type: "string", enum: ["box", "sphere", "plane", "cylinder", "cone", "torus"] },
                args: { type: "array", items: { type: "number" }, description: "Geometry args array, e.g. [1,1,1] for a box." },
                color: { type: "string", description: "Hex color string like '#ff0000'." },
                position: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
                rotation: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
                scale: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
                materialType: { type: "string", description: "Optional material type such as 'standard' or 'basic'." },
            },
            required: ["name", "geometryType"],
            additionalProperties: false,
        },
    },
    {
        type: "function",
        name: "create_buffer_mesh",
        description: "Create a single custom mesh node using BufferGeometry + Material. Use this only when the user explicitly asks for buffer geometry or custom mesh data.",
        parameters: {
            type: "object",
            properties: {
                name: { type: "string", description: "Descriptive node name." },
                parentId: { type: "string", description: "Parent node id. Defaults to the scene root." },
                positions: { type: "array", items: { type: "number" } },
                indices: { type: "array", items: { type: "number" } },
                normals: { type: "array", items: { type: "number" } },
                uvs: { type: "array", items: { type: "number" } },
                computeVertexNormals: { type: "boolean" },
                color: { type: "string", description: "Hex color string like '#ff0000'." },
                position: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
                rotation: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
                scale: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
                materialType: { type: "string", description: "Optional material type such as 'standard' or 'basic'." },
            },
            required: ["name", "positions"],
            additionalProperties: false,
        },
    },
    {
        type: "function",
        name: "create_model_node",
        description: "Create a node with Transform + Model using a filename from the model manifest.",
        parameters: {
            type: "object",
            properties: {
                name: { type: "string", description: "Descriptive node name." },
                parentId: { type: "string", description: "Parent node id. Defaults to the scene root." },
                filename: { type: "string", description: "Model path from the model manifest, such as '/models/environment/tree.glb'." },
                position: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
                rotation: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
                scale: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
                instanced: { type: "boolean" },
                repeat: { type: "boolean" },
                repeatAxes: { type: "array", items: { type: "object", additionalProperties: true } },
            },
            required: ["name", "filename"],
            additionalProperties: false,
        },
    },
    {
        type: "function",
        name: "create_node",
        description: "Create and add a new node under a parent using raw prefab component JSON keyed by component id. Example: components.geometry = { type: 'Geometry', properties: { geometryType: 'box', args: [1, 1, 1] } } and components.material = { type: 'Material', properties: { color: '#ff0000' } }.",
        parameters: {
            type: "object",
            properties: {
                name: { type: "string" },
                parentId: { type: "string" },
                components: {
                    type: "object",
                    additionalProperties: {
                        type: "object",
                        properties: { type: { type: "string" }, properties: { type: "object", additionalProperties: true } },
                        required: ["type"],
                        additionalProperties: false,
                    },
                },
                enabled: { type: "boolean" },
            },
            required: ["name"],
            additionalProperties: false,
        },
    },
    {
        type: "function",
        name: "rename_node",
        description: "Rename an existing node.",
        parameters: {
            type: "object",
            properties: { nodeId: { type: "string" }, name: { type: "string" } },
            required: ["nodeId", "name"],
            additionalProperties: false,
        },
    },
    {
        type: "function",
        name: "delete_node",
        description: "Delete a node by id.",
        parameters: {
            type: "object",
            properties: { nodeId: { type: "string" } },
            required: ["nodeId"],
            additionalProperties: false,
        },
    },
] as const;

export function normalizeBaseUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
        return DEFAULT_BASE_URL;
    }

    return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export function buildEndpoint(baseUrl: string, path: string) {
    const normalized = normalizeBaseUrl(baseUrl);
    const root = normalized.endsWith("/v1") ? `${normalized}/` : `${normalized}/v1/`;
    return new URL(path, root).toString();
}

export function extractModelIds(payload: unknown) {
    if (!payload || typeof payload !== "object" || !("data" in payload) || !Array.isArray(payload.data)) {
        return [] as string[];
    }

    return payload.data
        .map(item => (item && typeof item === "object" && "id" in item && typeof item.id === "string" ? item.id : null))
        .filter((item): item is string => Boolean(item))
        .sort((left, right) => left.localeCompare(right));
}

export function extractAssistantText(response: ResponseEnvelope) {
    const contentText = response.output
        ?.filter(item => item.type === "message")
        .flatMap(item => item.content ?? [])
        .map(item => item.text)
        .filter((text): text is string => Boolean(text))
        .join("\n")
        .trim();

    return contentText || response.output_text?.trim() || "";
}

export function extractFunctionCalls(response: ResponseEnvelope) {
    return (response.output ?? [])
        .filter(item => item.type === "function_call" && item.name && item.arguments)
        .map(item => ({
            name: item.name as string,
            arguments: item.arguments as string,
            callId: item.call_id ?? item.id ?? crypto.randomUUID(),
        }));
}

function serializeConversation(messages: ChatMessage[]) {
    return messages.map(message => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n");
}

function serializeToolOutputs(toolOutputs: Array<{ name: string; callId: string; result: ToolResult }>) {
    return toolOutputs
        .map(toolOutput => [
            `TOOL_CALL: ${toolOutput.name}`,
            `CALL_ID: ${toolOutput.callId}`,
            `RESULT: ${JSON.stringify(toolOutput.result, null, 2)}`,
        ].join("\n"))
        .join("\n\n");
}

function collectNodeSummary(node: PrefabNode, depth = 0, lines: string[] = []) {
    const indent = "  ".repeat(depth);
    const componentNames = Object.values(node.components ?? {}).map(component => component.type);
    const label = [node.id, node.name ? `name=${node.name}` : null, componentNames.length > 0 ? `components=${componentNames.join(",")}` : null]
        .filter(Boolean)
        .join(" ");

    lines.push(`${indent}- ${label}`);

    for (const child of node.children ?? []) {
        collectNodeSummary(child, depth + 1, lines);
    }

    return lines;
}

export function summarizePrefab(prefab: Prefab | null) {
    if (!prefab) {
        return "No prefab loaded.";
    }

    const root = prefab.root as PrefabNode;
    const lines = collectNodeSummary(root);
    return [`prefabId=${prefab.id}`, prefab.name ? `prefabName=${prefab.name}` : null, ...lines]
        .filter(Boolean)
        .join("\n");
}

export function buildAgentInput(params: {
    history: ChatMessage[];
    userText: string;
    prefab: Prefab | null;
    assistantDraft?: string;
    toolOutputs?: Array<{ name: string; callId: string; result: ToolResult }>;
}) {
    const sections = [
        "ROLE",
        "You are editing a live prefab scene.",
        "Inspect before mutating when needed.",
        "Prefer the smallest correct change.",
        "Use the provided tools for every prefab mutation.",
        "If the task is complete, return a brief user-facing answer.",
        "If more information or edits are needed, call tools instead of guessing.",
        "",
        "AUTHORING_RULES",
        ...AUTHORING_RULES,
        "",
        "CURRENT_PREFAB_SUMMARY",
        summarizePrefab(params.prefab),
        "",
        "CHAT_HISTORY",
        serializeConversation(params.history),
        "",
        "USER_REQUEST",
        params.userText,
    ];

    if (params.assistantDraft) {
        sections.push("", "ASSISTANT_DRAFT", params.assistantDraft);
    }

    if (params.toolOutputs && params.toolOutputs.length > 0) {
        sections.push("", "TOOL_RESULTS", serializeToolOutputs(params.toolOutputs));
    }

    sections.push("", "NEXT_ACTION", "Either call tools or provide the final answer.");
    return sections.join("\n");
}

function normalizeTraceBlock(value: string) {
    return value
        .replace(/\r/g, "")
        .split("\n")
        .map(line => line.trim())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function mergeTraceBlocks(...parts: string[]) {
    const blocks = parts
        .flatMap(part => part.split(/\n\s*\n/))
        .map(normalizeTraceBlock)
        .filter(Boolean);

    const merged: string[] = [];
    const seen = new Set<string>();

    for (const block of blocks) {
        if (seen.has(block)) {
            continue;
        }

        seen.add(block);
        merged.push(block);
    }

    return merged.join("\n\n");
}

export function appendTrace(existingTrace: string, nextTrace: string) {
    return mergeTraceBlocks(existingTrace, nextTrace);
}

export async function requestJson<T>(url: string, init: RequestInit) {
    const response = await fetch(url, init);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `${response.status} ${response.statusText}`);
    }

    return await response.json() as T;
}

export async function loadManifest(kind: "textures" | "models") {
    if (kind === "textures" && textureManifestCache) {
        return textureManifestCache;
    }

    if (kind === "models" && modelManifestCache) {
        return modelManifestCache;
    }

    const manifest = await requestJson<string[]>(`/${kind}/manifest.json`, { method: "GET" });

    if (!Array.isArray(manifest)) {
        throw new Error(`${kind} manifest was not an array.`);
    }

    if (kind === "textures") {
        textureManifestCache = manifest;
    } else {
        modelManifestCache = manifest;
    }

    return manifest;
}

export function searchManifestEntries(entries: string[], query: string, limit = 12) {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
        return [] as string[];
    }

    return entries
        .filter(entry => entry.toLowerCase().includes(normalizedQuery))
        .slice(0, Math.max(1, Math.min(limit, 50)));
}

export async function requestStream(
    url: string,
    init: RequestInit,
    handlers: { onTextDelta: (delta: string) => void; onTraceDelta: (delta: string) => void },
) {
    const response = await fetch(url, init);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `${response.status} ${response.statusText}`);
    }

    if (!response.body) {
        throw new Error("Streaming response body was empty.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventName = "message";
    let dataLines: string[] = [];
    let completedResponse: ResponseEnvelope | null = null;

    function flushEvent() {
        if (dataLines.length === 0) {
            eventName = "message";
            return;
        }

        const dataText = dataLines.join("\n").trim();
        dataLines = [];

        if (!dataText || dataText === "[DONE]") {
            eventName = "message";
            return;
        }

        let payload: StreamingResponseEvent;

        try {
            payload = JSON.parse(dataText) as StreamingResponseEvent;
        } catch {
            eventName = "message";
            return;
        }

        const effectiveType = payload.type ?? eventName;

        if (effectiveType === "response.output_text.delta" && typeof payload.delta === "string") {
            handlers.onTextDelta(payload.delta);
        }

        if ((effectiveType.includes("reasoning") || effectiveType.includes("thinking")) && typeof payload.delta === "string") {
            handlers.onTraceDelta(payload.delta);
        }

        if ((effectiveType.includes("reasoning") || effectiveType.includes("thinking")) && typeof payload.text === "string") {
            handlers.onTraceDelta(payload.text);
        }

        if (effectiveType === "response.completed") {
            completedResponse = payload.response ?? null;
        }

        eventName = "message";
    }

    while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

        let boundaryIndex = buffer.indexOf("\n\n");
        while (boundaryIndex !== -1) {
            const rawEvent = buffer.slice(0, boundaryIndex).replace(/\r/g, "");
            buffer = buffer.slice(boundaryIndex + 2);

            for (const line of rawEvent.split("\n")) {
                if (line.startsWith("event:")) {
                    eventName = line.slice(6).trim();
                    continue;
                }

                if (line.startsWith("data:")) {
                    dataLines.push(line.slice(5).trim());
                }
            }

            flushEvent();
            boundaryIndex = buffer.indexOf("\n\n");
        }

        if (done) {
            if (buffer.trim().length > 0) {
                const tailEvent = buffer.replace(/\r/g, "");
                for (const line of tailEvent.split("\n")) {
                    if (line.startsWith("event:")) {
                        eventName = line.slice(6).trim();
                        continue;
                    }

                    if (line.startsWith("data:")) {
                        dataLines.push(line.slice(5).trim());
                    }
                }
                flushEvent();
            }

            break;
        }
    }

    if (!completedResponse) {
        throw new Error("Stream ended before response.completed was received.");
    }

    return completedResponse;
}