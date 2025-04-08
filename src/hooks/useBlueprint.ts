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
const parseAndValidateResponse = (jsonString: string): LLMBlueprintData => {
  let potentialJson: string | undefined = undefined; 
  try {
    // Simple extraction: Find the first '{' and the last '}'
    const firstBraceIndex = jsonString.indexOf('{');
    const lastBraceIndex = jsonString.lastIndexOf('}');

    if (firstBraceIndex === -1 || lastBraceIndex === -1 || lastBraceIndex < firstBraceIndex) {
      console.error("Backend Response didn't contain valid JSON object delimiters ({...}):", jsonString);
      throw new Error("Backend response did not contain a recognizable JSON object structure ({...}).");
    }

    // Extract the potential JSON string between the braces
    potentialJson = jsonString.substring(firstBraceIndex, lastBraceIndex + 1);
    
    // Attempt to parse the extracted string
    const parsed = JSON.parse(potentialJson) as unknown; // Parse first

    // --- Validation (Simple structure) --- 
    if (typeof parsed !== 'object' || parsed === null) throw new Error('Parsed content is not an object.');
    
    // Validate top-level nodes and connections arrays
    if (!Array.isArray((parsed as any).nodes)) {
       throw new Error('Missing or invalid top-level \"nodes\" array.');
    }
    if (!Array.isArray((parsed as any).connections)) {
       throw new Error('Missing or invalid top-level \"connections\" array.');
    }
    // TODO: Add deeper validation for node/connection properties if needed
    // --- End Validation ---
    
    // If validation passes, cast to the stricter type
    return parsed as LLMBlueprintData; 

  } catch (error) { // Catches errors from extraction, JSON.parse, or validation checks
    console.error("Failed to parse or validate Backend response:", error);
    console.error("Original Raw Backend Response:", jsonString);
    if(potentialJson !== undefined) { 
        console.error("Extracted Potential JSON:", potentialJson);
    }
    
    if (error instanceof SyntaxError) {
       // Include line/col info if available (browser dependent)
       const syntaxDetails = error.message.includes('JSON.parse') ? error.message.substring(error.message.indexOf(':') + 1).trim() : 'invalid syntax';
       throw new Error(`Backend returned invalid JSON syntax: ${syntaxDetails}`); 
    } else if (error instanceof Error) { 
        throw new Error(`Backend response processing failed: ${error.message}`);
    } else {
        throw new Error("An unknown error occurred during response parsing.");
    }
  }
}

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
      const newNodes: Node<NodeData>[] = [];
      const newEdges: Edge[] = [];
      const tempIdToRealIdMap = new Map<string, string>();
      const nodePositions: { [key: string]: { x: number; y: number } } = {}; // Store initial positions
      const gridSpacing = 250; // Spacing between nodes
      let currentX = 100;
      let currentY = 100;

      // 1. Process Nodes (top level)
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