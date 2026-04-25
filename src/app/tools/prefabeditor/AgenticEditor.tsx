"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Prefab, PrefabEditorRef } from "react-three-game";
import {
    appendTrace,
    buildAgentInput,
    buildEndpoint,
    ChatMessage,
    DEFAULT_BASE_URL,
    extractAssistantText,
    extractFunctionCalls,
    extractModelIds,
    loadManifest,
    MAX_AGENT_STEPS,
    normalizeBaseUrl,
    requestJson,
    requestStream,
    searchManifestEntries,
    STORAGE_KEYS,
    summarizePrefab,
    TOOL_DEFINITIONS,
    ToolResult,
} from "./AgenticEditor.shared";

type AgenticEditorProps = {
    editorRef: React.RefObject<PrefabEditorRef | null>;
    prefab: Prefab | null;
};

export default function AgenticEditor({ editorRef, prefab }: AgenticEditorProps) {
    const prefabRef = useRef<Prefab | null>(prefab);
    const [isOpen, setIsOpen] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
    const [models, setModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState("");
    const [isConfigured, setIsConfigured] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [statusText, setStatusText] = useState<string | null>(null);
    const [errorText, setErrorText] = useState<string | null>(null);
    const [draft, setDraft] = useState("");
    const [streamingText, setStreamingText] = useState("");
    const [streamingTrace, setStreamingTrace] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "I can inspect and modify the live prefab. Ask for concrete scene edits like creating nodes, changing transforms, or updating component properties.",
        },
    ]);

    useEffect(() => {
        prefabRef.current = prefab;
    }, [prefab]);

    useEffect(() => {
        const storedApiKey = window.localStorage.getItem(STORAGE_KEYS.apiKey) ?? "";
        const storedBaseUrl = window.localStorage.getItem(STORAGE_KEYS.baseUrl) ?? DEFAULT_BASE_URL;
        const storedModel = window.localStorage.getItem(STORAGE_KEYS.model) ?? "";

        setApiKey(storedApiKey);
        setBaseUrl(storedBaseUrl);
        setSelectedModel(storedModel);

        if (!storedApiKey) {
            return;
        }

        void connect(storedBaseUrl, storedApiKey, storedModel);
    }, []);

    const canSend = useMemo(() => {
        return isConfigured && !isSending && draft.trim().length > 0 && prefab !== null;
    }, [draft, isConfigured, isSending, prefab]);

    async function probeModels(nextBaseUrl: string, nextApiKey: string) {
        return await requestJson<{ data?: Array<{ id?: string }> }>(buildEndpoint(nextBaseUrl, "models"), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${nextApiKey.trim()}`,
            },
        });
    }

    async function connect(nextBaseUrl = baseUrl, nextApiKey = apiKey, preferredModel = selectedModel) {
        setIsConnecting(true);
        setErrorText(null);
        setStatusText("Probing available models...");

        try {
            const modelResponse = await probeModels(nextBaseUrl, nextApiKey);
            const nextModels = extractModelIds(modelResponse);

            if (nextModels.length === 0) {
                throw new Error("No models were returned by the API.");
            }

            const resolvedModel = nextModels.includes(preferredModel) ? preferredModel : nextModels[0];

            setModels(nextModels);
            setSelectedModel(resolvedModel);
            setIsConfigured(true);
            setStatusText(null);
            window.localStorage.setItem(STORAGE_KEYS.apiKey, nextApiKey);
            window.localStorage.setItem(STORAGE_KEYS.baseUrl, normalizeBaseUrl(nextBaseUrl));
            window.localStorage.setItem(STORAGE_KEYS.model, resolvedModel);
        } catch (error) {
            setIsConfigured(false);
            setErrorText(error instanceof Error ? error.message : "Failed to connect to the API.");
            setStatusText(null);
        } finally {
            setIsConnecting(false);
        }
    }

    function disconnect() {
        window.localStorage.removeItem(STORAGE_KEYS.apiKey);
        window.localStorage.removeItem(STORAGE_KEYS.baseUrl);
        window.localStorage.removeItem(STORAGE_KEYS.model);
        setIsConfigured(false);
        setModels([]);
        setSelectedModel("");
        setStatusText(null);
        setErrorText(null);
    }

    async function runTool(name: string, rawArguments: string): Promise<ToolResult> {
        const editor = editorRef.current;

        if (!editor) {
            return { ok: false, message: "Prefab editor scene is not ready." };
        }

        const rootId = prefabRef.current?.root?.id ?? "root";

        let args: Record<string, unknown>;

        try {
            args = rawArguments ? JSON.parse(rawArguments) as Record<string, unknown> : {};
        } catch {
            return { ok: false, message: `Tool arguments for ${name} were not valid JSON.` };
        }

        try {
            if (name === "get_prefab_summary") {
                return {
                    ok: true,
                    summary: summarizePrefab(prefabRef.current),
                };
            }

            if (name === "get_texture_manifest") {
                const entries = await loadManifest("textures");

                return {
                    ok: true,
                    count: entries.length,
                    entries,
                };
            }

            if (name === "search_texture_manifest") {
                const entries = await loadManifest("textures");
                const query = typeof args.query === "string" ? args.query : "";
                const limit = typeof args.limit === "number" ? args.limit : 12;
                const matches = searchManifestEntries(entries, query, limit);

                return {
                    ok: true,
                    count: matches.length,
                    matches,
                };
            }

            if (name === "get_model_manifest") {
                const entries = await loadManifest("models");

                return {
                    ok: true,
                    count: entries.length,
                    entries,
                };
            }

            if (name === "search_model_manifest") {
                const entries = await loadManifest("models");
                const query = typeof args.query === "string" ? args.query : "";
                const limit = typeof args.limit === "number" ? args.limit : 12;
                const matches = searchManifestEntries(entries, query, limit);

                return {
                    ok: true,
                    count: matches.length,
                    matches,
                };
            }

            if (name === "create_primitive") {
                const nameArg = typeof args.name === "string" ? args.name : null;
                const geometryType = typeof args.geometryType === "string" ? args.geometryType : null;

                if (!nameArg || !geometryType) {
                    return { ok: false, message: "name and geometryType are required." };
                }

                const nextNode = {
                    id: crypto.randomUUID(),
                    name: nameArg,
                    enabled: true,
                    components: {
                        transform: {
                            type: "Transform",
                            properties: {
                                position: Array.isArray(args.position) ? args.position : [0, 0, 0],
                                rotation: Array.isArray(args.rotation) ? args.rotation : [0, 0, 0],
                                scale: Array.isArray(args.scale) ? args.scale : [1, 1, 1],
                            },
                        },
                        geometry: {
                            type: "Geometry",
                            properties: {
                                geometryType,
                                ...(Array.isArray(args.args) ? { args: args.args } : {}),
                            },
                        },
                        material: {
                            type: "Material",
                            properties: {
                                ...(typeof args.materialType === "string" ? { materialType: args.materialType } : {}),
                                color: typeof args.color === "string" ? args.color : "#ffffff",
                            },
                        },
                    },
                    children: [],
                };

                editor.addNode(nextNode, {
                    parentId: typeof args.parentId === "string" ? args.parentId : rootId,
                    select: true,
                });

                return { ok: true, message: `Created primitive ${nextNode.id}.`, nodeId: nextNode.id };
            }

            if (name === "create_buffer_mesh") {
                const nameArg = typeof args.name === "string" ? args.name : null;

                if (!nameArg || !Array.isArray(args.positions)) {
                    return { ok: false, message: "name and positions are required." };
                }

                const nextNode = {
                    id: crypto.randomUUID(),
                    name: nameArg,
                    enabled: true,
                    components: {
                        transform: {
                            type: "Transform",
                            properties: {
                                position: Array.isArray(args.position) ? args.position : [0, 0, 0],
                                rotation: Array.isArray(args.rotation) ? args.rotation : [0, 0, 0],
                                scale: Array.isArray(args.scale) ? args.scale : [1, 1, 1],
                            },
                        },
                        bufferGeometry: {
                            type: "BufferGeometry",
                            properties: {
                                positions: args.positions,
                                ...(Array.isArray(args.indices) ? { indices: args.indices } : {}),
                                ...(Array.isArray(args.normals) ? { normals: args.normals } : {}),
                                ...(Array.isArray(args.uvs) ? { uvs: args.uvs } : {}),
                                computeVertexNormals: args.computeVertexNormals !== false,
                            },
                        },
                        material: {
                            type: "Material",
                            properties: {
                                ...(typeof args.materialType === "string" ? { materialType: args.materialType } : {}),
                                color: typeof args.color === "string" ? args.color : "#ffffff",
                            },
                        },
                    },
                    children: [],
                };

                editor.addNode(nextNode, {
                    parentId: typeof args.parentId === "string" ? args.parentId : rootId,
                    select: true,
                });

                return { ok: true, message: `Created buffer mesh ${nextNode.id}.`, nodeId: nextNode.id };
            }

            if (name === "create_model_node") {
                const nameArg = typeof args.name === "string" ? args.name : null;
                const filename = typeof args.filename === "string" ? args.filename : null;

                if (!nameArg || !filename) {
                    return { ok: false, message: "name and filename are required." };
                }

                const nextNode = {
                    id: crypto.randomUUID(),
                    name: nameArg,
                    enabled: true,
                    components: {
                        transform: {
                            type: "Transform",
                            properties: {
                                position: Array.isArray(args.position) ? args.position : [0, 0, 0],
                                rotation: Array.isArray(args.rotation) ? args.rotation : [0, 0, 0],
                                scale: Array.isArray(args.scale) ? args.scale : [1, 1, 1],
                            },
                        },
                        model: {
                            type: "Model",
                            properties: {
                                filename,
                                ...(typeof args.instanced === "boolean" ? { instanced: args.instanced } : {}),
                                ...(typeof args.repeat === "boolean" ? { repeat: args.repeat } : {}),
                                ...(Array.isArray(args.repeatAxes) ? { repeatAxes: args.repeatAxes } : {}),
                            },
                        },
                    },
                    children: [],
                };

                editor.addNode(nextNode, {
                    parentId: typeof args.parentId === "string" ? args.parentId : rootId,
                    select: true,
                });

                return { ok: true, message: `Created model node ${nextNode.id}.`, nodeId: nextNode.id };
            }

            if (name === "get_prefab_json") {
                return {
                    ok: true,
                    prefab: prefabRef.current,
                };
            }

            if (name === "set_node_transform") {
                const nodeId = typeof args.nodeId === "string" ? args.nodeId : null;
                const node = nodeId ? editor.getNode(nodeId) : null;

                if (!nodeId || !node) {
                    return { ok: false, message: `Node ${String(args.nodeId)} was not found.` };
                }

                editor.updateNode(nodeId, currentNode => {
                    const transform = currentNode.components?.transform;
                    const existingProperties = transform?.type === "Transform" && transform.properties && typeof transform.properties === "object"
                        ? transform.properties as Record<string, unknown>
                        : {};

                    return {
                        ...currentNode,
                        components: {
                            ...currentNode.components,
                            transform: {
                                type: "Transform",
                                properties: {
                                    position: Array.isArray(args.position) ? args.position : existingProperties.position ?? [0, 0, 0],
                                    rotation: Array.isArray(args.rotation) ? args.rotation : existingProperties.rotation ?? [0, 0, 0],
                                    scale: Array.isArray(args.scale) ? args.scale : existingProperties.scale ?? [1, 1, 1],
                                },
                            },
                        },
                    };
                });

                return { ok: true, message: `Updated transform on ${nodeId}.` };
            }

            if (name === "update_component_properties") {
                const nodeId = typeof args.nodeId === "string" ? args.nodeId : null;
                const componentName = typeof args.componentName === "string" ? args.componentName : null;
                const nextProperties = args.properties && typeof args.properties === "object" ? args.properties as Record<string, unknown> : null;
                const replace = args.replace === true;
                const node = nodeId ? editor.getNode(nodeId) : null;

                if (!nodeId || !node || !componentName || !nextProperties) {
                    return { ok: false, message: "nodeId, componentName, and properties are required." };
                }

                editor.updateNode(nodeId, currentNode => {
                    const componentKey = Object.entries(currentNode.components ?? {}).find(([, component]) => component?.type === componentName)?.[0]
                        ?? componentName.toLowerCase();
                    const existingComponent = currentNode.components?.[componentKey];
                    const existingProperties = existingComponent?.properties && typeof existingComponent.properties === "object"
                        ? existingComponent.properties as Record<string, unknown>
                        : {};

                    return {
                        ...currentNode,
                        components: {
                            ...currentNode.components,
                            [componentKey]: {
                                type: existingComponent?.type ?? componentName,
                                properties: replace ? { ...nextProperties } : { ...existingProperties, ...nextProperties },
                            },
                        },
                    };
                });

                return { ok: true, message: `Updated ${componentName} on ${nodeId}.` };
            }

            if (name === "add_component") {
                const nodeId = typeof args.nodeId === "string" ? args.nodeId : null;
                const componentName = typeof args.componentName === "string" ? args.componentName : null;
                const node = nodeId ? editor.getNode(nodeId) : null;

                if (!nodeId || !node || !componentName) {
                    return { ok: false, message: "nodeId and componentName are required." };
                }

                editor.updateNode(nodeId, currentNode => ({
                    ...currentNode,
                    components: {
                        ...currentNode.components,
                        [componentName.toLowerCase()]: {
                            type: componentName,
                            properties: args.properties && typeof args.properties === "object"
                                ? args.properties as Record<string, unknown>
                                : {},
                        },
                    },
                }));

                return { ok: true, message: `Added ${componentName} to ${nodeId}.` };
            }

            if (name === "remove_component") {
                const nodeId = typeof args.nodeId === "string" ? args.nodeId : null;
                const componentName = typeof args.componentName === "string" ? args.componentName : null;
                const node = nodeId ? editor.getNode(nodeId) : null;

                if (!nodeId || !node || !componentName) {
                    return { ok: false, message: "nodeId and componentName are required." };
                }

                editor.updateNode(nodeId, currentNode => {
                    const nextComponents = { ...(currentNode.components ?? {}) };
                    const componentKey = Object.entries(nextComponents).find(([, component]) => component?.type === componentName)?.[0]
                        ?? componentName.toLowerCase();
                    delete nextComponents[componentKey];

                    return {
                        ...currentNode,
                        components: nextComponents,
                    };
                });

                return { ok: true, message: `Removed ${componentName} from ${nodeId}.` };
            }

            if (name === "create_node") {
                const nameArg = typeof args.name === "string" ? args.name : null;

                if (!nameArg) {
                    return { ok: false, message: "name is required." };
                }

                const nextComponents = Object.fromEntries(
                    Object.entries(args.components && typeof args.components === "object" ? args.components : {}).map(([key, value]) => {
                        const component = value && typeof value === "object" ? value as { type?: unknown; properties?: unknown } : {};

                        return [key, {
                            type: typeof component.type === "string" ? component.type : key,
                            properties: component.properties && typeof component.properties === "object"
                                ? component.properties as Record<string, unknown>
                                : {},
                        }];
                    }),
                );

                const nextNode = {
                    id: crypto.randomUUID(),
                    name: nameArg,
                    enabled: args.enabled !== false,
                    components: nextComponents,
                    children: [],
                };

                editor.addNode(nextNode, {
                    parentId: typeof args.parentId === "string" ? args.parentId : rootId,
                    select: true,
                });

                return { ok: true, message: `Created node ${nextNode.id}.`, nodeId: nextNode.id };
            }

            if (name === "rename_node") {
                const nodeId = typeof args.nodeId === "string" ? args.nodeId : null;
                const nameArg = typeof args.name === "string" ? args.name : null;

                if (!nodeId || !nameArg) {
                    return { ok: false, message: "nodeId and name are required." };
                }

                editor.updateNode(nodeId, node => ({ ...node, name: nameArg }));

                return { ok: true, message: `Renamed ${nodeId} to ${nameArg}.` };
            }

            if (name === "delete_node") {
                const nodeId = typeof args.nodeId === "string" ? args.nodeId : null;

                if (!nodeId) {
                    return { ok: false, message: "nodeId is required." };
                }

                editor.deleteNode(nodeId);

                return { ok: true, message: `Deleted ${nodeId}.` };
            }

            return { ok: false, message: `Unknown tool: ${name}` };
        } catch (error) {
            return {
                ok: false,
                message: error instanceof Error ? error.message : `Tool ${name} failed.`,
            };
        }
    }

    async function runAgent(userText: string, history: ChatMessage[]) {
        const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
        const trimmedApiKey = apiKey.trim();
        const nextHistory: ChatMessage[] = [...history, { id: crypto.randomUUID(), role: "user", content: userText }];
        let nextInput = buildAgentInput({
            history,
            userText,
            prefab: prefabRef.current,
        });
        let lastAssistantText = "";
        let lastAssistantTrace = "";
        let cumulativeStreamingTrace = "";

        for (let step = 0; step < MAX_AGENT_STEPS; step += 1) {
            setStreamingText("");
            setStreamingTrace(cumulativeStreamingTrace);
            let streamedAssistantText = "";
            let streamedAssistantTrace = "";
            const response = await requestStream(buildEndpoint(normalizedBaseUrl, "responses"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${trimmedApiKey}`,
                },
                body: JSON.stringify({
                    model: selectedModel,
                    input: nextInput,
                    tools: TOOL_DEFINITIONS,
                    tool_choice: "auto",
                    stream: true,
                }),
            }, {
                onTextDelta: (delta) => {
                    streamedAssistantText += delta;
                    setStreamingText(current => current + delta);
                },
                onTraceDelta: (delta) => {
                    streamedAssistantTrace += delta;
                    setStreamingTrace(appendTrace(cumulativeStreamingTrace, streamedAssistantTrace));
                },
            });

            const assistantText = extractAssistantText(response);
            const resolvedAssistantText = assistantText || streamedAssistantText;

            if (resolvedAssistantText) {
                lastAssistantText = resolvedAssistantText;
            }

            if (streamedAssistantTrace.trim()) {
                cumulativeStreamingTrace = appendTrace(cumulativeStreamingTrace, streamedAssistantTrace);
                lastAssistantTrace = cumulativeStreamingTrace;
                setStreamingTrace(cumulativeStreamingTrace);
            }

            const functionCalls = extractFunctionCalls(response);

            if (functionCalls.length === 0) {
                setStreamingText("");
                setStreamingTrace("");
                return {
                    text: lastAssistantText || "No assistant response text was returned.",
                    trace: lastAssistantTrace,
                };
            }

            const toolOutputs = [] as Array<{ name: string; callId: string; result: ToolResult }>;

            for (const functionCall of functionCalls) {
                setStatusText(`Running ${functionCall.name}...`);
                const result = await runTool(functionCall.name, functionCall.arguments);
                toolOutputs.push({
                    name: functionCall.name,
                    callId: functionCall.callId,
                    result,
                });
            }

            nextInput = buildAgentInput({
                history: nextHistory,
                userText,
                prefab: prefabRef.current,
                assistantDraft: lastAssistantText,
                toolOutputs,
            });
        }

        setStreamingText("");
        setStreamingTrace("");
        return {
            text: lastAssistantText || "Stopped after too many tool steps.",
            trace: lastAssistantTrace,
        };
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const trimmedDraft = draft.trim();

        if (!trimmedDraft || !canSend) {
            return;
        }

        const nextUserMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: trimmedDraft,
        };

        const history = [...messages, nextUserMessage];
        setMessages(history);
        setDraft("");
        setIsSending(true);
        setErrorText(null);
        setStreamingText("");
        setStreamingTrace("");
        setStatusText("Thinking...");

        try {
            const assistantReply = await runAgent(trimmedDraft, messages);

            setMessages(current => [
                ...current,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: assistantReply.text,
                    trace: assistantReply.trace,
                },
            ]);
            setStatusText(null);
        } catch (error) {
            setErrorText(error instanceof Error ? error.message : "The request failed.");
            setStatusText(null);
            setStreamingText("");
            setStreamingTrace("");
        } finally {
            setIsSending(false);
        }
    }

    return (
        <div className="pointer-events-none absolute right-3 bottom-3 z-40 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2">
            {isOpen ? (
                <section className="pointer-events-auto flex h-[min(72vh,42rem)] w-[min(25rem,calc(100vw-1.5rem))] flex-col overflow-hidden border border-[#7f7f7f] bg-[#d4d4d4] text-[#505050] shadow-[0_0_0_1px_#f4f4f4_inset,2px_2px_0_0_rgba(0,0,0,0.15)]">
                    <header className="flex items-center justify-between border-b border-[#9a9a9a] bg-[#cfcfcf] px-3 py-2">
                        <div>
                            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#454545]">Agentic Editor</div>
                            <div className="text-xs text-[#6c6c6c]">Live prefab tools over the current editor scene</div>
                        </div>
                        <button
                            type="button"
                            className="border border-[#8d8d8d] bg-[#dcdcdc] px-2 py-1 text-[11px] text-[#444] transition hover:bg-[#e6e6e6]"
                            onClick={() => setIsOpen(false)}
                        >
                            Collapse
                        </button>
                    </header>

                    {!isConfigured ? (
                        <div className="flex flex-1 flex-col gap-3 p-3">
                            <div className="text-sm text-[#5b5b5b]">Connect an OpenAI-compatible endpoint. Credentials stay in local storage in this browser.</div>

                            <label className="flex flex-col gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[#6a6a6a]">
                                Base URL
                                <input
                                    className="border border-[#9f9f9f] bg-[#f5f5f5] px-2 py-1 text-sm normal-case tracking-normal text-[#2d2d2d] outline-none transition focus:border-[#67bfdc] focus:bg-[#fbfbfb]"
                                    value={baseUrl}
                                    onChange={event => setBaseUrl(event.target.value)}
                                    placeholder={DEFAULT_BASE_URL}
                                />
                            </label>

                            <label className="flex flex-col gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[#6a6a6a]">
                                API Token
                                <input
                                    type="password"
                                    className="border border-[#9f9f9f] bg-[#f5f5f5] px-2 py-1 text-sm normal-case tracking-normal text-[#2d2d2d] outline-none transition focus:border-[#67bfdc] focus:bg-[#fbfbfb]"
                                    value={apiKey}
                                    onChange={event => setApiKey(event.target.value)}
                                    placeholder="sk-..."
                                />
                            </label>

                            <button
                                type="button"
                                className="border border-[#7fb0c1] bg-[#8fd3eb] px-3 py-1 text-sm font-medium text-[#24505f] transition hover:bg-[#9edbf1] disabled:cursor-not-allowed disabled:border-[#9a9a9a] disabled:bg-[#bfbfbf] disabled:text-[#7a7a7a]"
                                disabled={isConnecting || apiKey.trim().length === 0}
                                onClick={() => {
                                    void connect();
                                }}
                            >
                                {isConnecting ? "Connecting..." : "Probe Models"}
                            </button>

                            {statusText ? <div className="text-sm text-[#3f8ea8]">{statusText}</div> : null}
                            {errorText ? <div className="border border-[#d08c8c] bg-[#f4d6d6] px-2 py-1 text-sm text-[#8a4949]">{errorText}</div> : null}
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 border-b border-[#9a9a9a] bg-[#cfcfcf] px-3 py-2">
                                <select
                                    className="min-w-0 flex-1 border border-[#9f9f9f] bg-[#f5f5f5] px-2 py-1 text-sm text-[#2d2d2d] outline-none"
                                    value={selectedModel}
                                    onChange={event => {
                                        const nextModel = event.target.value;

                                        setSelectedModel(nextModel);
                                        window.localStorage.setItem(STORAGE_KEYS.model, nextModel);
                                    }}
                                >
                                    {models.map(model => (
                                        <option key={model} value={model} className="bg-[#f5f5f5] text-[#2d2d2d]">
                                            {model}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="border border-[#8d8d8d] bg-[#dcdcdc] px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-[#444] transition hover:bg-[#e6e6e6]"
                                    onClick={disconnect}
                                >
                                    Reset
                                </button>
                            </div>

                            <div className="flex-1 space-y-2 overflow-y-auto bg-[#dbdbdb] px-3 py-3">
                                {messages.map(message => (
                                    <div
                                        key={message.id}
                                        className={message.role === "assistant"
                                            ? "mr-8 border border-[#9a9a9a] bg-[#efefef] px-3 py-2 text-sm text-[#353535]"
                                            : "ml-8 border border-[#7fb0c1] bg-[#8fd3eb] px-3 py-2 text-sm text-[#1b404c]"
                                        }
                                    >
                                        <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[#757575]">{message.role}</div>
                                        {message.trace ? (
                                            <div className="mb-2 whitespace-pre-wrap border border-[#b7b7b7] bg-[#e3e3e3] px-2 py-1 text-[11px] leading-5 text-[#646464]">
                                                {message.trace}
                                            </div>
                                        ) : null}
                                        <div className="whitespace-pre-wrap">{message.content}</div>
                                    </div>
                                ))}
                                {streamingTrace ? (
                                    <div className="mr-8 border border-[#b7b7b7] bg-[#e3e3e3] px-3 py-2 text-[11px] leading-5 text-[#646464]">
                                        <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[#757575]">thinking</div>
                                        <div className="whitespace-pre-wrap">{streamingTrace}</div>
                                    </div>
                                ) : null}
                                {streamingText ? (
                                    <div className="mr-8 border border-[#7fb0c1] bg-[#dff4fb] px-3 py-2 text-sm text-[#2d4d57]">
                                        <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[#6a8f9b]">assistant</div>
                                        <div className="whitespace-pre-wrap">{streamingText}</div>
                                    </div>
                                ) : null}
                                {statusText ? <div className="text-xs uppercase tracking-[0.12em] text-[#4a96af]">{statusText}</div> : null}
                                {errorText ? <div className="border border-[#d08c8c] bg-[#f4d6d6] px-2 py-1 text-sm text-[#8a4949]">{errorText}</div> : null}
                            </div>

                            <div className="border-t border-[#9a9a9a] bg-[#d0d0d0] p-3">
                                <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
                                    <textarea
                                        className="min-h-24 resize-none border border-[#9f9f9f] bg-[#f5f5f5] px-2 py-1 text-sm text-[#2d2d2d] outline-none transition placeholder:text-[#8a8a8a] focus:border-[#67bfdc] focus:bg-[#fbfbfb]"
                                        value={draft}
                                        onChange={event => setDraft(event.target.value)}
                                        onKeyDown={event => {
                                            if (event.key === "Enter" && !event.shiftKey) {
                                                event.preventDefault();

                                                if (!canSend) {
                                                    return;
                                                }

                                                void handleSubmit(event as unknown as React.FormEvent<HTMLFormElement>);
                                            }
                                        }}
                                        placeholder={prefab ? "Ask for a prefab edit..." : "Load a prefab first."}
                                        disabled={isSending || prefab === null}
                                    />
                                    <button
                                        type="submit"
                                        className="self-end border border-[#7fb0c1] bg-[#8fd3eb] px-3 py-1 text-sm font-medium text-[#24505f] transition hover:bg-[#9edbf1] disabled:cursor-not-allowed disabled:border-[#9a9a9a] disabled:bg-[#bfbfbf] disabled:text-[#7a7a7a]"
                                        disabled={!canSend}
                                    >
                                        {isSending ? "Working..." : "Send"}
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </section>
            ) : null}

            <button
                type="button"
                className="pointer-events-auto border border-[#8d8d8d] bg-[#d8d8d8] px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#454545] shadow-[0_0_0_1px_#f4f4f4_inset,2px_2px_0_0_rgba(0,0,0,0.15)] transition hover:bg-[#e2e2e2]"
                onClick={() => setIsOpen(current => !current)}
            >
                {isOpen ? "Hide Agent" : "Agent"}
            </button>
        </div>
    );
}
