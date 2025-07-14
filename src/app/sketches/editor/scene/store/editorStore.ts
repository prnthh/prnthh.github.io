import { create } from 'zustand';
import { Object3D, Object3DEventMap } from 'three';
import React from 'react';
import { SceneNode } from '../viewer/SceneViewer';
import { GLTFLoader, FBXLoader } from 'three/examples/jsm/Addons.js';

export enum EditorModes {
    Edit = "edit",
    Play = "play",
    Pause = "pause",
}

interface EditorStore {
  // Scene graph state
  sceneGraph: SceneNode[];
  setSceneGraph: (sceneGraph: SceneNode[] | ((prev: SceneNode[]) => SceneNode[])) => void;
  
  // Models state
  models: { [filename: string]: any };
  setModels: (models: { [filename: string]: any } | ((prev: { [filename: string]: any }) => { [filename: string]: any })) => void;
  
  // Editor mode state
  playMode: EditorModes;
  setPlayMode: (mode: EditorModes) => void;
  
  // Selection state
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  
  // Node refs
  nodeRefs: { [id: string]: React.RefObject<Object3D<Object3DEventMap> | null> };
  getNodeRef: (id: string) => React.RefObject<Object3D<Object3DEventMap> | null>;
  
  // Actions
  addModelNodeToSceneGraph: (model: any, filename: string) => void;
  loadMissingModels: () => void;
  initializeSceneGraph: (initialSceneGraph?: SceneNode[]) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state
  sceneGraph: [],
  models: {},
  playMode: EditorModes.Play,
  selectedNodeId: null,
  nodeRefs: {},
  
  // Setters
  setSceneGraph: (sceneGraph) => set((state) => ({
    sceneGraph: typeof sceneGraph === 'function' ? sceneGraph(state.sceneGraph) : sceneGraph
  })),
  
  setModels: (models) => set((state) => ({
    models: typeof models === 'function' ? models(state.models) : models
  })),
  
  setPlayMode: (playMode) => set({ playMode }),
  
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  
  getNodeRef: (id: string) => {
    const { nodeRefs } = get();
    if (!nodeRefs[id]) {
      const newRef = React.createRef<Object3D<Object3DEventMap>>();
      set((state) => ({
        nodeRefs: { ...state.nodeRefs, [id]: newRef }
      }));
      return newRef;
    }
    return nodeRefs[id];
  },
  
  // Actions
  addModelNodeToSceneGraph: (model, filename) => {
    const { setModels, setSceneGraph } = get();
    
    // Store the model
    setModels((prevModels) => ({
      ...prevModels,
      [filename]: model
    }));
    
    // Add node to scene graph
    setSceneGraph((prev) => {
      const root = prev[0];
      const newNode: SceneNode = {
        id: Math.random().toString(36).substr(2, 9),
        name: filename,
        children: [],
        components: [
          { type: 'model', filename }
        ],
        transform: {
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: 1
        }
      };
      return [
        {
          ...root,
          children: [...root.children, newNode]
        }
      ] as SceneNode[];
    });
  },
  
  loadMissingModels: () => {
    const { sceneGraph, models, setModels } = get();
    
    // Collect referenced files
    const referencedFiles = new Set<string>();
    function collectModelFiles(nodes: SceneNode[]) {
      nodes.forEach(node => {
        if (node.components) {
          node.components.forEach(comp => {
            if (comp.type === 'model' && comp.filename) {
              referencedFiles.add(comp.filename);
            }
          });
        }
        if (node.children && node.children.length > 0) {
          collectModelFiles(node.children);
        }
      });
    }
    collectModelFiles(sceneGraph);
    
    // Mark missing models
    setModels((prevModels) => {
      const newModels = { ...prevModels };
      referencedFiles.forEach(filename => {
        if (!(filename in newModels)) {
          newModels[filename] = { missing: true };
        }
      });
      return newModels;
    });
    
    // Load missing models
    referencedFiles.forEach(filename => {
      if (models[filename] && !models[filename].missing) return;
      
      if (filename.endsWith('.glb') || filename.endsWith('.gltf')) {
        const loader = new GLTFLoader();
        loader.load(`/${filename}`,
          gltf => {
            setModels(prev => ({ ...prev, [filename]: gltf.scene }));
          },
          undefined,
          err => {
            setModels(prev => ({ ...prev, [filename]: { missing: true, error: err } }));
          }
        );
      } else if (filename.endsWith('.fbx')) {
        const loader = new FBXLoader();
        loader.load(`/${filename}`,
          model => {
            setModels(prev => ({ ...prev, [filename]: model }));
          },
          undefined,
          err => {
            setModels(prev => ({ ...prev, [filename]: { missing: true, error: err } }));
          }
        );
      }
    });
  },
  
  initializeSceneGraph: (initialSceneGraph) => {
    const sceneGraph = initialSceneGraph ?? [{
      id: Math.random().toString(36).substr(2, 9),
      name: "Root",
      children: [],
      components: [],
    }];
    
    set({ sceneGraph });
  }
}));
