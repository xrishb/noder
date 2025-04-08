import { create } from 'zustand';
import { 
  Connection, 
  Edge, 
  EdgeChange, 
  Node, 
  NodeChange, 
  addEdge, 
  OnNodesChange, 
  OnEdgesChange, 
  OnConnect, 
  applyNodeChanges, 
  applyEdgeChanges 
} from 'reactflow';
import { BlueprintGeneration, NodeData } from '../types/BlueprintTypes';

export interface BlueprintState {
  // Blueprint data
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNodes: Node<NodeData>[];
  selectedEdges: Edge[];
  blueprintName: string;
  blueprintDescription: string;
  isLoading: boolean;
  
  // Node methods
  onNodesChange: OnNodesChange;
  addNode: (node: Node<NodeData>) => void;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  setNodes: (nodes: Node<NodeData>[]) => void;
  
  // Edge methods
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  removeEdge: (edgeId: string) => void;
  setEdges: (edges: Edge[]) => void;
  
  // Selection methods
  setSelectedNodes: (nodes: Node<NodeData>[]) => void;
  setSelectedEdges: (edges: Edge[]) => void;
  
  // Blueprint methods
  setBlueprintName: (name: string) => void;
  setBlueprintDescription: (description: string) => void;
  clearBlueprint: () => void;
  loadBlueprint: (blueprint: BlueprintGeneration) => void;
  setIsLoading: (isLoading: boolean) => void;
}

// Create a store with Zustand
export const useBlueprintStore = create<BlueprintState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  selectedNodes: [],
  selectedEdges: [],
  blueprintName: 'New Blueprint',
  blueprintDescription: '',
  isLoading: false,
  
  // Node methods
  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  
  addNode: (node: Node<NodeData>) => {
    set({
      nodes: [...get().nodes, node],
    });
  },
  
  removeNode: (nodeId: string) => {
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      // Also remove any connected edges
      edges: get().edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
    });
  },
  
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...data,
            },
          };
        }
        return node;
      }),
    });
  },
  
  setNodes: (nodes) => set({ nodes }),
  
  // Edge methods
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  
  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(
        {
          ...connection,
          animated: connection.sourceHandle?.startsWith('exec'),
          style: { 
            strokeWidth: 2,
          },
          className: connection.sourceHandle?.split('-')[0] || 'edge-default'
        },
        get().edges
      ),
    });
  },
  
  removeEdge: (edgeId: string) => {
    set({
      edges: get().edges.filter((edge) => edge.id !== edgeId),
    });
  },
  
  setEdges: (edges: Edge[]) => {
    set({ edges });
  },
  
  // Selection methods
  setSelectedNodes: (nodes: Node<NodeData>[]) => {
    set({ selectedNodes: nodes });
  },
  
  setSelectedEdges: (edges: Edge[]) => {
    set({ selectedEdges: edges });
  },
  
  // Blueprint methods
  setBlueprintName: (name: string) => {
    set({ blueprintName: name });
  },
  
  setBlueprintDescription: (description: string) => {
    set({ blueprintDescription: description });
  },
  
  clearBlueprint: () => {
    set({ 
      nodes: [],
      edges: [],
      selectedNodes: [],
      selectedEdges: [],
    });
  },
  
  loadBlueprint: (blueprint: BlueprintGeneration) => {
    set({
      blueprintName: blueprint.name,
      blueprintDescription: blueprint.description,
      nodes: blueprint.nodes,
      edges: blueprint.edges,
      selectedNodes: [],
      selectedEdges: [],
    });
  },
  
  setIsLoading: (isLoading: boolean) => {
    set({ isLoading });
  },
})); 