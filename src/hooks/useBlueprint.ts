import { useCallback, useState } from 'react';
import { addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange, Connection, Node, Edge, OnNodesChange, OnEdgesChange, Viewport } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { useBlueprintStore } from '../store/blueprintStore';
import { BlueprintGenerationService } from '../services/blueprintGenerationService';
// Remove schema import - no longer needed
// import { blueprintNodeSchema } from '../schemas/blueprintNodeSchema'; 
import { LLMBlueprintData, NodeData, PinType, UnrealNode, UnrealConnection } from '../types/BlueprintTypes';
import { toast } from 'react-hot-toast';
import { nanoid } from 'nanoid';

// Layout constants (only for nodes now)
const NODE_WIDTH = 200;
const NODE_HEIGHT = 150; 
const HORIZONTAL_SPACING = 300;
const VERTICAL_SPACING = 200; 
const NODES_PER_ROW = 4;
// Removed GROUP constants

// Re-add helper to generate React Flow handle ID
const getRfHandleId = (pinType: PinType, pinName: string): string => {
  // Replace spaces/special chars, lowercase for consistency
  const processedName = pinName.replace(/\s+|[^a-zA-Z0-9_-]/g, '-').toLowerCase(); 
  return `${pinType}-${processedName}`;
};

// Remove schema processing logic - no longer needed
/*
// Convert schema object to map for faster lookups
const blueprintNodeSchemaMap = new Map<string, NodeSchema>(
  Object.values(blueprintNodeSchema).map(schema => [schema.name, schema])
);
*/

// Helper function to parse and validate the raw JSON string from the backend
const parseAndValidateResponse = (responseText: string): LLMBlueprintData => {
  try {
    // First try to parse the entire response as JSON
    let jsonData: LLMBlueprintData;
    try {
      jsonData = JSON.parse(responseText);
    } catch (e) {
      // If that fails, try to extract JSON from the text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
      jsonData = JSON.parse(jsonMatch[0]);
    }

    // Validate the structure
    if (!jsonData.nodes || !Array.isArray(jsonData.nodes)) {
      throw new Error('Response missing nodes array');
    }
    if (!jsonData.connections || !Array.isArray(jsonData.connections)) {
      throw new Error('Response missing connections array');
    }

    // Validate each node has required fields
    jsonData.nodes.forEach((node, index) => {
      if (!node.id || !node.type || !node.data) {
        throw new Error(`Node at index ${index} missing required fields`);
      }
    });

    // Validate each connection has required fields
    jsonData.connections.forEach((conn, index) => {
      if (!conn.source || !conn.target) {
        throw new Error(`Connection at index ${index} missing source or target`);
      }
    });

    return jsonData;
  } catch (error) {
    console.error('Error parsing/validating response:', error);
    throw new Error(`Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const useBlueprint = () => {
  const store = useBlueprintStore();

  /**
   * Load a blueprint from the LLM-generated JSON data.
   * Converts the LLM structure to React Flow nodes and edges.
   * @param query The query string to generate the blueprint.
   */
  const loadBlueprintFromLLM = useCallback(async (query: string) => {
    console.log("[loadBlueprintFromLLM] Received query:", query);
    store.clearBlueprint(); 
    store.setIsLoading(true);
    const loadingToastId = toast.loading('Generating blueprint from query...');

    try {
      // Call the service, which now fetches from the backend API
      const rawResponseText = await BlueprintGenerationService.generateFromQuery(query);
      
      // Parse and validate the raw string response HERE
      const llmBlueprintData = parseAndValidateResponse(rawResponseText);

      // --- Transformation Logic (remains the same) ---
      console.log("Parsed LLM Data:", llmBlueprintData); // Add detailed logging
      
      const newNodes: Node<NodeData>[] = [];
      const newEdges: Edge[] = [];
      const tempIdToRealIdMap = new Map<string, string>();
      const nodePositions: { [key: string]: { x: number; y: number } } = {}; // Store initial positions
      const gridSpacing = 250; // Spacing between nodes
      let currentX = 100;
      let currentY = 100;

      // 1. Process Nodes (top level)
      // Add checks for existence and type before iterating
      if (!llmBlueprintData.nodes || !Array.isArray(llmBlueprintData.nodes)) {
          console.error("Validation Error: llmBlueprintData.nodes is not a valid array:", llmBlueprintData.nodes);
          throw new Error('Invalid blueprint data: nodes array is missing or invalid.');
      }
      
      for (const llmNode of llmBlueprintData.nodes) {
        if (!llmNode || !llmNode.id || !llmNode.title || !llmNode.nodeType || !llmNode.inputs || !llmNode.outputs) {
          console.warn(`Skipping invalid node:`, llmNode);
          continue;
        }
        
        const realNodeId = uuidv4();
        tempIdToRealIdMap.set(llmNode.id, realNodeId);
        
        const nodeData: NodeData = {
          title: llmNode.title,
          nodeType: llmNode.nodeType,
          inputs: llmNode.inputs.map(pin => ({ ...pin })),
          outputs: llmNode.outputs.map(pin => ({ ...pin })),
          description: llmNode.description || '',
          color: llmNode.color,
          // Removed sectionId/sectionName
        };

        // Calculate position (simple grid)
        const position = { x: currentX, y: currentY };
        nodePositions[llmNode.id] = position;
        currentX += gridSpacing;
        if (currentX >= HORIZONTAL_SPACING) {
          currentX = 100;
          currentY += VERTICAL_SPACING;
        }

        const blueprintNode: Node<NodeData> = {
          id: realNodeId,
          type: 'blueprintNode',
          position: position, 
          data: nodeData,
          // Removed parentNode and extent
        };
        newNodes.push(blueprintNode);
      } // End node loop

      // Create map of ALL processed nodes for connection validation
      const allNodesMap = new Map<string, Node<NodeData>>();
      newNodes.forEach(node => {
        allNodesMap.set(node.id, node);
        nodePositions[node.id] = node.position;
      }); // Use real ID for map key

      // 2. Process Connections (top level)
      // Add checks for existence and type before iterating
      if (!llmBlueprintData.connections || !Array.isArray(llmBlueprintData.connections)) {
          console.error("Validation Error: llmBlueprintData.connections is not a valid array:", llmBlueprintData.connections);
          throw new Error('Invalid blueprint data: connections array is missing or invalid.');
      }
      
      for (const connection of llmBlueprintData.connections) {
         if (!connection || !connection.sourceNodeId || !connection.sourcePinName || !connection.targetNodeId || !connection.targetPinName) {
            console.warn(`Skipping invalid connection:`, connection);
            continue;
         }
         
         // Get REAL node IDs from the map
         const realSourceId = tempIdToRealIdMap.get(connection.sourceNodeId);
         const realTargetId = tempIdToRealIdMap.get(connection.targetNodeId);

         if (!realSourceId || !realTargetId) {
            console.warn(`Conn Error: Node ID mapping not found: ${connection.sourceNodeId} -> ${connection.targetNodeId}`);
            continue;
         }

         // Find nodes using the REAL IDs
         const sourceNode = allNodesMap.get(realSourceId);
         const targetNode = allNodesMap.get(realTargetId);

         if (!sourceNode || !targetNode) {
            console.warn(`Conn Error: Node object not found for mapped IDs: ${realSourceId} -> ${realTargetId}`);
            continue;
         }

         // Pin validation logic (remains largely the same)
         const sourcePin = sourceNode.data.outputs.find(p => p.name === connection.sourcePinName);
         const targetPin = targetNode.data.inputs.find(p => p.name === connection.targetPinName);
         
         if (!sourcePin) {
           console.warn(`Skipping connection: Source pin '${connection.sourcePinName}' not found on node '${sourceNode.data.title}' (ID: ${realSourceId}).`);
           continue;
         }
         if (!targetPin) {
           console.warn(`Skipping connection: Target pin '${connection.targetPinName}' not found on node '${targetNode.data.title}' (ID: ${realTargetId}).`);
           continue;
         }
         
         // Type compatibility checks (remain the same)
         const isExecConnection = sourcePin.type === 'exec' && targetPin.type === 'exec';
         const isDataConnection = sourcePin.type !== 'exec' && targetPin.type !== 'exec';
         if (!isExecConnection && !isDataConnection) { /* ... */ continue; }
         if (isDataConnection && sourcePin.type !== targetPin.type) { /* ... */ continue; } 
         
         newEdges.push({
           id: `edge-${realSourceId}-${connection.sourcePinName}-${realTargetId}-${connection.targetPinName}`,
           source: realSourceId,
           target: realTargetId,
           sourceHandle: getRfHandleId(sourcePin.type, sourcePin.name),
           targetHandle: getRfHandleId(targetPin.type, targetPin.name),
           animated: sourcePin.type === 'exec',
           style: { strokeWidth: 2 },
         });
      } // End connection loop

      // Update store with simpler structure
      store.setNodes(newNodes);
      store.setEdges(newEdges);
      store.setBlueprintName(llmBlueprintData.blueprintName || 'Generated Blueprint'); // Restore setting name/desc
      store.setBlueprintDescription(llmBlueprintData.blueprintDescription || 'Generated from query');
      console.log(`Loaded blueprint: ${llmBlueprintData.blueprintName || 'Untitled'}`);
      toast.success("Blueprint generated!", { id: loadingToastId });

    } catch (error) {
      console.error("Blueprint generation failed:", error);
      toast.error(`Blueprint generation failed: ${error instanceof Error ? error.message : String(error)}`, { id: loadingToastId });
      // Clear potentially partial state on error
      store.clearBlueprint();
    } finally {
      store.setIsLoading(false);
    }
  }, [store]);

  /**
   * Export the current blueprint to JSON
   */
  const exportBlueprint = useCallback((): LLMBlueprintData => {
    // TODO: This should ideally convert BACK from React Flow state to LLMBlueprintData
    // For now, just returning empty structure as placeholder
    console.warn('exportBlueprint needs implementation to convert ReactFlow state to LLM format.');
    return {
      blueprintName: store.blueprintName,
      blueprintDescription: store.blueprintDescription,
      nodes: [], // Placeholder
      connections: [], // Placeholder
    };
  }, [store.blueprintName, store.blueprintDescription, store.nodes, store.edges]);
  
  /**
   * Clear the current blueprint
   */
  const clearBlueprint = useCallback(() => {
    store.clearBlueprint();
    store.setBlueprintName('New Blueprint'); // Reset name/desc
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