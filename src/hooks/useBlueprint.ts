import { useCallback, useState } from 'react';
import { addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange, Connection, Node, Edge, OnNodesChange, OnEdgesChange, Viewport } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { useBlueprintStore } from '../store/blueprintStore';
import { BlueprintGenerationService } from '../services/blueprintGenerationService';

// import { blueprintNodeSchema } from '../schemas/blueprintNodeSchema'; 
import { LLMBlueprintData, NodeData, PinType, BlueprintNode, BlueprintEdge } from '../types/BlueprintTypes';
import { toast } from 'react-hot-toast';
import { nanoid } from 'nanoid';

// Layout constants (only for nodes now)
const NODE_WIDTH = 200;
const NODE_HEIGHT = 150; 
const HORIZONTAL_SPACING = 300;
const VERTICAL_SPACING = 200; 
const NODES_PER_ROW = 4;

// Re-add helper to generate React Flow handle ID
const getRfHandleId = (pinType: PinType, pinName: string): string => {
  // Replace spaces/special chars, lowercase for consistency
  const processedName = pinName.replace(/\s+|[^a-zA-Z0-9_-]/g, '-').toLowerCase(); 
  return `${pinType}-${processedName}`;
};


export const useBlueprint = () => {
  const store = useBlueprintStore();

  /**
   * Load a blueprint from the LLM-generated JSON data.
   * Converts the LLM structure to React Flow nodes and edges.
   * @param query The query string to generate the blueprint.
   */
  const loadBlueprintFromLLM = useCallback(async (query: string) => {
    try {
      store.setIsLoading(true);
      console.log('Loading blueprint from LLM with query:', query);
      
      const response = await BlueprintGenerationService.generateFromQuery(query);
      console.log('Received response:', response);
      
      if (!response) {
        throw new Error('No response received from API');
      }

      // Parse response as unknown first to avoid type error
      let parsedData;
      try {
        parsedData = JSON.parse(response as string) as LLMBlueprintData;
        console.log('Parsed blueprint data:', parsedData);
      } catch (parseError) {
        console.error('Failed to parse blueprint JSON:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      if (!parsedData.nodes || !Array.isArray(parsedData.nodes)) {
        console.error('Invalid blueprint structure - missing or invalid nodes array:', parsedData);
        throw new Error('Invalid blueprint data: missing or invalid nodes array');
      }

      if (!parsedData.connections || !Array.isArray(parsedData.connections)) {
        console.error('Invalid blueprint structure - missing or invalid connections array:', parsedData);
        throw new Error('Invalid blueprint data: missing or invalid connections array');
      }

      // Create a mapping of temporary IDs to actual UUIDs
      const idMapping: { [key: string]: string } = {};
      
      // Generate React Flow nodes
      const nodes: BlueprintNode[] = parsedData.nodes.map((node) => {
        const newId = uuidv4();
        idMapping[node.id] = newId;
        
        // Create a new object to ensure we preserve all properties from the API
        const nodeData = {
          ...node,
          id: newId,
          subtitle: node.nodeType || '',  // Add subtitle with node type
          description: node.description || '',  // Preserve description
          // Ensure inputs and outputs are properly formatted
          inputs: node.inputs || [],
          outputs: node.outputs || []
        };
        
        console.log("Creating node:", nodeData);
        
        return {
          id: newId,
          type: 'customNode',
          // Use existing position if available, otherwise start at 0,0 and auto-layout will adjust
          position: node.position || { x: 0, y: 0 },
          // Store all the node data in the data property
          data: nodeData,
        };
      });

      // Generate React Flow edges using the correct property names
      const edges: BlueprintEdge[] = parsedData.connections.map((connection, index) => {
        // Determine the pin types
        // Note: Find the node and pin to get its type
        const sourceNode = parsedData.nodes.find(n => n.id === connection.sourceNodeId);
        const targetNode = parsedData.nodes.find(n => n.id === connection.targetNodeId);
        
        // Find the corresponding output and input pins
        const sourcePin = sourceNode?.outputs?.find(p => p.name === connection.sourcePinName);
        const targetPin = targetNode?.inputs?.find(p => p.name === connection.targetPinName);
        
        // Get the pin types (default to 'exec' if not found)
        const sourcePinType = sourcePin?.type || 'exec';
        const targetPinType = targetPin?.type || 'exec';
        
        // Format handle IDs exactly like BlueprintNode.tsx does
        const sourceHandleId = `${sourcePinType}-${connection.sourcePinName.replace(/\s+|[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`;
        const targetHandleId = `${targetPinType}-${connection.targetPinName.replace(/\s+|[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`;
        
        console.log(`Creating edge: ${sourceHandleId} -> ${targetHandleId}`);
        
        return {
          id: uuidv4(),
          source: idMapping[connection.sourceNodeId],
          sourceHandle: sourceHandleId,
          target: idMapping[connection.targetNodeId],
          targetHandle: targetHandleId,
        };
      });

      // Update the store
      store.setBlueprintName(parsedData.blueprintName || 'Untitled Blueprint');
      store.setNodes(nodes);
      store.setEdges(edges);
      
      toast.success('Blueprint generated successfully!');
      
    } catch (error) {
      console.error('Error loading blueprint:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate blueprint');
    } finally {
      store.setIsLoading(false);
    }
  }, [store.setNodes, store.setEdges, store.setBlueprintName, store.setIsLoading]);

  /**
   * Export the current blueprint to JSON
   */
  const exportBlueprint = useCallback(() => {
    // Return the current blueprint data
    return {
      blueprintName: store.blueprintName,
      blueprintDescription: store.blueprintDescription,
      nodes: store.nodes.map(node => ({
        id: node.id,
        title: node.data.title,
        nodeType: node.data.nodeType,
        inputs: node.data.inputs,
        outputs: node.data.outputs,
        description: node.data.description,
        color: node.data.color,
        position: node.position, // Include node position for layout preservation
      })),
      connections: store.edges.map(edge => ({
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        sourcePinName: edge.sourceHandle?.split('-').slice(1).join('-') || '',
        targetPinName: edge.targetHandle?.split('-').slice(1).join('-') || '',
      })),
    };
  }, [store.blueprintName, store.blueprintDescription, store.nodes, store.edges]);
  
  /**
   * Clear the current blueprint
   */
  const clearBlueprint = useCallback(() => {
    store.clearBlueprint();
    store.setBlueprintName('New Blueprint');
    store.setBlueprintDescription('');
  }, [store]);
  
  return {
    loadBlueprint: loadBlueprintFromLLM,
    exportBlueprint,
    clearBlueprint,
    isLoading: store.isLoading,
    blueprintName: store.blueprintName,
    blueprintDescription: store.blueprintDescription
  };
}; 