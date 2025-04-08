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
      
      // **Parse JSON directly here**
      let llmBlueprintData: LLMBlueprintData;
      try {
        llmBlueprintData = JSON.parse(rawResponseText);
      } catch (parseError) {
         console.error('Failed to parse raw response text:', parseError);
         console.error('Raw Response Text:', rawResponseText);
         // Try extracting JSON if direct parse fails
         const jsonMatch = rawResponseText.match(/\{[\s\S]*\}/);
         if (!jsonMatch) {
            throw new Error('Response is not valid JSON and no JSON object found within.');
         }
         try {
            llmBlueprintData = JSON.parse(jsonMatch[0]);
         } catch (extractParseError) {
             console.error('Failed to parse extracted JSON:', extractParseError);
             throw new Error('Extracted content is not valid JSON.');
         }
      }

      // --- Transformation Logic --- 
      console.log("Parsed LLM Data (Direct Parse):", llmBlueprintData); // Log parsed data
      
      // Basic structure validation after direct parse
      if (!llmBlueprintData || typeof llmBlueprintData !== 'object') {
         throw new Error('Parsed response is not a valid object.');
      }

      const newNodes: Node<NodeData>[] = [];
      const newEdges: Edge[] = [];
      const tempIdToRealIdMap = new Map<string, string>();
      const nodePositions: { [key: string]: { x: number; y: number } } = {}; // Store initial positions
      const gridSpacing = 250; // Spacing between nodes
      let currentX = 100;
      let currentY = 100;

      // 1. Process Nodes (top level)
      // Ensure nodes array exists before iterating
      if (!Array.isArray(llmBlueprintData.nodes)) {
          console.error("Validation Error: llmBlueprintData.nodes is not a valid array:", llmBlueprintData.nodes);
          throw new Error('Invalid blueprint data: nodes array is missing or invalid.');
      }
      
      for (const llmNode of llmBlueprintData.nodes) {
        // Basic node structure check
        if (!llmNode || !llmNode.id || !llmNode.title || !llmNode.nodeType) {
          console.warn(`Skipping invalid base node structure:`, llmNode);
          continue;
        }
        
        const realNodeId = uuidv4();
        tempIdToRealIdMap.set(llmNode.id, realNodeId);
        
        // **Defensive check for pins arrays before mapping**
        if (!Array.isArray(llmNode.inputs)) {
          console.error(`Data Error: Node '${llmNode.id}' (${llmNode.title}) has invalid 'inputs':`, llmNode.inputs);
          throw new Error(`Invalid blueprint data: Node ${llmNode.id} 'inputs' is not an array.`);
        }
        if (!Array.isArray(llmNode.outputs)) {
          console.error(`Data Error: Node '${llmNode.id}' (${llmNode.title}) has invalid 'outputs':`, llmNode.outputs);
          throw new Error(`Invalid blueprint data: Node ${llmNode.id} 'outputs' is not an array.`);
        }
        
        const nodeData: NodeData = {
          title: llmNode.title,
          nodeType: llmNode.nodeType,
          inputs: llmNode.inputs.map(pin => ({ ...pin })), // Safer map
          outputs: llmNode.outputs.map(pin => ({ ...pin })), // Safer map
          description: llmNode.description || '',
          color: llmNode.color,
        };

        // Calculate position (simple grid)
        const position = { x: currentX, y: currentY };
        nodePositions[llmNode.id] = position;
        currentX += gridSpacing;
        if (currentX >= HORIZONTAL_SPACING) { // Corrected condition
          currentX = 100;
          currentY += VERTICAL_SPACING;
        }

        const blueprintNode: Node<NodeData> = {
          id: realNodeId,
          type: 'blueprintNode',
          position: position, 
          data: nodeData,
        };
        newNodes.push(blueprintNode);
      } // End node loop

      // Create map of ALL processed nodes for connection validation
      const allNodesMap = new Map<string, Node<NodeData>>();
      newNodes.forEach(node => {
        allNodesMap.set(node.id, node);
        nodePositions[node.id] = node.position; // Use real ID for map key
      });

      // 2. Process Connections (top level)
      // Ensure connections array exists before iterating
      if (!Array.isArray(llmBlueprintData.connections)) {
          console.error("Validation Error: llmBlueprintData.connections is not a valid array:", llmBlueprintData.connections);
          throw new Error('Invalid blueprint data: connections array is missing or invalid.');
      }
      
      for (const connection of llmBlueprintData.connections) {
         // Basic connection structure check
         if (!connection || !connection.sourceNodeId || !connection.sourcePinName || !connection.targetNodeId || !connection.targetPinName) {
            console.warn(`Skipping invalid base connection structure:`, connection);
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

         // **Defensive check for pin arrays before finding**
         if (!sourceNode.data || !Array.isArray(sourceNode.data.outputs)) {
           console.error(`Data Error: Source node '${realSourceId}' or its data/outputs are invalid:`, sourceNode);
           throw new Error(`Invalid state: Cannot find outputs for source node ${realSourceId}.`);
         }
          if (!targetNode.data || !Array.isArray(targetNode.data.inputs)) {
           console.error(`Data Error: Target node '${realTargetId}' or its data/inputs are invalid:`, targetNode);
           throw new Error(`Invalid state: Cannot find inputs for target node ${realTargetId}.`);
         }

         // Pin lookup logic
         const sourcePin = sourceNode.data.outputs.find(p => p.name === connection.sourcePinName); // Safer find
         const targetPin = targetNode.data.inputs.find(p => p.name === connection.targetPinName); // Safer find
         
         if (!sourcePin) {
           console.warn(`Skipping connection: Source pin '${connection.sourcePinName}' not found on node '${sourceNode.data.title}' (ID: ${realSourceId}).`);
           continue;
         }
         if (!targetPin) {
           console.warn(`Skipping connection: Target pin '${connection.targetPinName}' not found on node '${targetNode.data.title}' (ID: ${realTargetId}).`);
           continue;
         }
         
         // Type compatibility checks
         const isExecConnection = sourcePin.type === 'exec' && targetPin.type === 'exec';
         const isDataConnection = sourcePin.type !== 'exec' && targetPin.type !== 'exec';
         if (!isExecConnection && !isDataConnection) { 
             console.warn(`Skipping connection: Incompatible pin types (non-exec/non-data) from '${sourcePin.name}' (${sourcePin.type}) to '${targetPin.name}' (${targetPin.type}).`);
             continue; 
         }
         if (isDataConnection && sourcePin.type !== targetPin.type) { 
             console.warn(`Skipping connection: Mismatched data pin types ('${sourcePin.type}' -> '${targetPin.type}') from '${sourcePin.name}' to '${targetPin.name}'.`);
             continue; 
         }
         
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

      // Update store
      store.setNodes(newNodes);
      store.setEdges(newEdges);
      store.setBlueprintName(llmBlueprintData.blueprintName || 'Generated Blueprint');
      store.setBlueprintDescription(llmBlueprintData.blueprintDescription || 'Generated from query');
      console.log(`Loaded blueprint: ${llmBlueprintData.blueprintName || 'Untitled'}`);
      toast.success("Blueprint generated!", { id: loadingToastId });

    } catch (error) {
      console.error("Blueprint generation failed:", error);
      toast.error(`Blueprint generation failed: ${error instanceof Error ? error.message : String(error)}`, { id: loadingToastId });
      store.clearBlueprint(); // Clear potentially partial state on error
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