import { Node, Edge } from 'reactflow';

export type PinType = 
  'exec' | 'bool' | 'float' | 'int' | 'string' | 
  'vector' | 'vector2d' | 'vector3' | 'vector4' |
  'object' | 'class' | 'name' | 
  'byte' | 'wildcard' | 'materialattributes';

export type NodeType = 'event' | 'function' | 'variable' | 'macro';

export interface PinData {
  name: string;
  type: PinType;
  description?: string;
  value?: any;
}

export interface NodeData {
  title: string;
  nodeType: NodeType;
  inputs: PinData[];
  outputs: PinData[];
  description?: string;
  color?: string;
}

export type BlueprintNode = Node<NodeData>;
export type BlueprintEdge = Edge;

export interface BlueprintTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  nodes: BlueprintNode[];
  connections: BlueprintEdge[];
}

export interface LLMBlueprintData {
  blueprintName?: string;
  blueprintDescription?: string;
  nodes: {
    id: string;
    title: string;
    nodeType: NodeType;
    color?: string;
    inputs: { name: string; type: PinType; value?: any; }[];
    outputs: { name: string; type: PinType; }[];
  }[];
  connections: {
    sourceNodeId: string;
    sourcePinName: string;
    targetNodeId: string;
    targetPinName: string;
  }[];
}

export interface BlueprintGeneration {
  name: string;
  description: string;
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
}