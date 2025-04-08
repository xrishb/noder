import { Node, Edge } from 'reactflow';
import { NodeData, BlueprintGeneration, PinType } from '../types/BlueprintTypes';
import blueprintNodes from '../schemas/blueprintNodeSchema';

// Temporary generator using pattern matching
// In a production version, this would use NLP or LLM to understand queries
export const generateBlueprint = (query: string): BlueprintGeneration => {
  query = query.toLowerCase();
  
  // Simple pattern matching
  if (query.includes('sprint') || query.includes('shift')) {
    return generateSprintBlueprint();
  } else if (query.includes('toggle') && (query.includes('menu') || query.includes('esc'))) {
    return generateToggleMenuBlueprint();
  } else {
    // Default sample blueprint
    return generateSampleBlueprint(query);
  }
};

// Helper to create a node
const createNode = (
  id: string, 
  type: string, 
  position: { x: number; y: number },
  nodeData: NodeData
): Node<NodeData> => {
  return {
    id,
    type,
    position,
    data: nodeData,
  };
};

// Helper to create an edge
const createEdge = (
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
  type: PinType
): Edge => {
  // Convert handle names to IDs
  const sourceHandleId = `${type}-${sourceHandle.replace(/\s+/g, '-').toLowerCase()}`;
  const targetHandleId = `${type}-${targetHandle.replace(/\s+/g, '-').toLowerCase()}`;
  
  return {
    id: `${source}-${sourceHandleId}-${target}-${targetHandleId}`,
    source,
    sourceHandle: sourceHandleId,
    target,
    targetHandle: targetHandleId,
    animated: type === 'exec',
    className: `edge-${type}`,
    style: { strokeWidth: 2 },
  };
};

// Generate a sprint mechanic blueprint
const generateSprintBlueprint = (): BlueprintGeneration => {
  const nodes: Node<NodeData>[] = [
    // Event node for Shift pressed
    createNode('node-1', 'blueprintNode', { x: 100, y: 100 }, {
      title: 'InputAction Shift Pressed',
      nodeType: 'event',
      inputs: [],
      outputs: [
        { name: 'Pressed', type: 'exec' },
      ],
    }),
    
    // Branch node
    createNode('node-2', 'blueprintNode', { x: 400, y: 100 }, {
      title: 'Branch',
      nodeType: 'function',
      inputs: [
        { name: 'Execute', type: 'exec' },
        { name: 'Condition', type: 'bool' },
      ],
      outputs: [
        { name: 'True', type: 'exec' },
        { name: 'False', type: 'exec' },
      ],
    }),
    
    // Set movement speed for sprint
    createNode('node-3', 'blueprintNode', { x: 700, y: 50 }, {
      title: 'Set Movement Component Max Walk Speed',
      nodeType: 'function',
      inputs: [
        { name: 'Execute', type: 'exec' },
        { name: 'Target', type: 'object' },
        { name: 'New Max Walk Speed', type: 'float' },
      ],
      outputs: [
        { name: 'Execute', type: 'exec' },
      ],
    }),
    
    // Set movement speed for normal walk
    createNode('node-4', 'blueprintNode', { x: 700, y: 200 }, {
      title: 'Set Movement Component Max Walk Speed',
      nodeType: 'function',
      inputs: [
        { name: 'Execute', type: 'exec' },
        { name: 'Target', type: 'object' },
        { name: 'New Max Walk Speed', type: 'float' },
      ],
      outputs: [
        { name: 'Execute', type: 'exec' },
      ],
    }),
    
    // Default walk speed variable
    createNode('node-5', 'blueprintNode', { x: 400, y: 300 }, {
      title: 'Default Walk Speed',
      nodeType: 'variable',
      inputs: [],
      outputs: [
        { name: 'Value', type: 'float' },
      ],
    }),
    
    // Sprint speed variable
    createNode('node-6', 'blueprintNode', { x: 400, y: 20 }, {
      title: 'Sprint Speed Value',
      nodeType: 'variable',
      inputs: [],
      outputs: [
        { name: 'Value', type: 'float' },
      ],
    }),
    
    // Character reference
    createNode('node-7', 'blueprintNode', { x: 400, y: 180 }, {
      title: 'Character Reference',
      nodeType: 'variable',
      inputs: [],
      outputs: [
        { name: 'Value', type: 'object' },
      ],
    }),
  ];
  
  const edges: Edge[] = [
    // Connect event to branch
    createEdge('node-1', 'Pressed', 'node-2', 'Execute', 'exec'),
    
    // Connect branch to sprint and normal walk
    createEdge('node-2', 'True', 'node-3', 'Execute', 'exec'),
    createEdge('node-2', 'False', 'node-4', 'Execute', 'exec'),
    
    // Connect sprint speed variable
    createEdge('node-6', 'Value', 'node-3', 'New Max Walk Speed', 'float'),
    
    // Connect walk speed variable
    createEdge('node-5', 'Value', 'node-4', 'New Max Walk Speed', 'float'),
    
    // Connect character reference
    createEdge('node-7', 'Value', 'node-3', 'Target', 'object'),
    createEdge('node-7', 'Value', 'node-4', 'Target', 'object'),
  ];
  
  return {
    name: 'Sprint Mechanic',
    description: 'Blueprint for toggling sprint when Shift is pressed',
    nodes,
    edges,
  };
};

// Generate a toggle menu blueprint
const generateToggleMenuBlueprint = (): BlueprintGeneration => {
  const nodes: Node<NodeData>[] = [
    // Event node for ESC pressed
    createNode('node-1', 'blueprintNode', { x: 100, y: 150 }, {
      title: 'InputAction Escape Pressed',
      nodeType: 'event',
      inputs: [],
      outputs: [
        { name: 'Pressed', type: 'exec' },
      ],
    }),
    
    // Get player controller
    createNode('node-2', 'blueprintNode', { x: 300, y: 80 }, {
      title: 'Get Player Controller',
      nodeType: 'function',
      inputs: [
        { name: 'Execute', type: 'exec' },
        { name: 'Player Index', type: 'int' },
      ],
      outputs: [
        { name: 'Execute', type: 'exec' },
        { name: 'Return Value', type: 'object' },
      ],
    }),
    
    // Is widget visible
    createNode('node-3', 'blueprintNode', { x: 450, y: 150 }, {
      title: 'Is Widget Visible',
      nodeType: 'function',
      inputs: [
        { name: 'Execute', type: 'exec' },
        { name: 'Target', type: 'object' },
      ],
      outputs: [
        { name: 'Execute', type: 'exec' },
        { name: 'Is Visible?', type: 'bool' },
      ],
    }),
    
    // Branch node
    createNode('node-4', 'blueprintNode', { x: 650, y: 150 }, {
      title: 'Branch',
      nodeType: 'function',
      inputs: [
        { name: 'Execute', type: 'exec' },
        { name: 'Condition', type: 'bool' },
      ],
      outputs: [
        { name: 'True', type: 'exec' },
        { name: 'False', type: 'exec' },
      ],
    }),
    
    // Add widget to viewport
    createNode('node-5', 'blueprintNode', { x: 850, y: 100 }, {
      title: 'Add Widget To Viewport',
      nodeType: 'function',
      inputs: [
        { name: 'Execute', type: 'exec' },
        { name: 'Widget', type: 'object' },
        { name: 'Z Order', type: 'int' },
      ],
      outputs: [
        { name: 'Execute', type: 'exec' },
      ],
    }),
    
    // Remove from parent
    createNode('node-6', 'blueprintNode', { x: 850, y: 220 }, {
      title: 'Remove From Parent',
      nodeType: 'function',
      inputs: [
        { name: 'Execute', type: 'exec' },
        { name: 'Target', type: 'object' },
      ],
      outputs: [
        { name: 'Execute', type: 'exec' },
      ],
    }),
    
    // Main menu widget class
    createNode('node-7', 'blueprintNode', { x: 220, y: 220 }, {
      title: 'Main Menu Widget Class',
      nodeType: 'variable',
      inputs: [],
      outputs: [
        { name: 'Value', type: 'object' },
      ],
    }),
    
    // Create widget
    createNode('node-8', 'blueprintNode', { x: 600, y: 50 }, {
      title: 'Create Widget',
      nodeType: 'function',
      inputs: [
        { name: 'Execute', type: 'exec' },
        { name: 'Owning Player', type: 'object' },
        { name: 'Class', type: 'object' },
      ],
      outputs: [
        { name: 'Execute', type: 'exec' },
        { name: 'Return Value', type: 'object' },
      ],
    }),
  ];
  
  const edges: Edge[] = [
    // Connect event to player controller
    createEdge('node-1', 'Pressed', 'node-2', 'Execute', 'exec'),
    
    // Connect player controller to widget visibility check
    createEdge('node-2', 'Execute', 'node-3', 'Execute', 'exec'),
    createEdge('node-2', 'Return Value', 'node-8', 'Owning Player', 'object'),
    
    // Connect widget class to create widget and widget visibility
    createEdge('node-7', 'Value', 'node-8', 'Class', 'object'),
    createEdge('node-7', 'Value', 'node-3', 'Target', 'object'),
    
    // Connect widget visibility to branch
    createEdge('node-3', 'Execute', 'node-4', 'Execute', 'exec'),
    createEdge('node-3', 'Is Visible?', 'node-4', 'Condition', 'bool'),
    
    // Connect branch to widget creation or removal
    createEdge('node-4', 'False', 'node-8', 'Execute', 'exec'),
    createEdge('node-4', 'True', 'node-6', 'Execute', 'exec'),
    
    // Connect widget creation to add to viewport
    createEdge('node-8', 'Execute', 'node-5', 'Execute', 'exec'),
    createEdge('node-8', 'Return Value', 'node-5', 'Widget', 'object'),
  ];
  
  return {
    name: 'Toggle Menu Blueprint',
    description: 'Blueprint for toggling the main menu when ESC is pressed',
    nodes,
    edges,
  };
};

// Generate a sample blueprint with debug message
const generateSampleBlueprint = (query: string): BlueprintGeneration => {
  // Extract potential message from query or use default
  const message = query.includes('print') || query.includes('message') || query.includes('debug')
    ? query.replace(/print|message|debug/g, '').trim()
    : 'Hello, World!';
  
  const cleanMessage = message || 'Blueprint generated successfully!';
  
  const nodes: Node<NodeData>[] = [
    // Begin Play event
    createNode('node-1', 'blueprintNode', { x: 100, y: 150 }, {
      title: 'Event BeginPlay',
      nodeType: 'event',
      inputs: [],
      outputs: [
        { name: 'Event', type: 'exec' },
      ],
    }),
    
    // Print String
    createNode('node-2', 'blueprintNode', { x: 350, y: 150 }, {
      title: 'Print String',
      nodeType: 'function',
      inputs: [
        { name: 'Execute', type: 'exec' },
        { name: 'String', type: 'string' },
        { name: 'Print to Screen', type: 'bool' },
        { name: 'Print to Log', type: 'bool' },
        { name: 'Text Color', type: 'vector' },
      ],
      outputs: [
        { name: 'Execute', type: 'exec' },
      ],
    }),
    
    // Get Player Character
    createNode('node-3', 'blueprintNode', { x: 250, y: 250 }, {
      title: 'Get Player Character',
      nodeType: 'function',
      inputs: [
        { name: 'Player Index', type: 'int' },
      ],
      outputs: [
        { name: 'Return Value', type: 'object' },
      ],
    }),
    
    // Debug Message variable
    createNode('node-4', 'blueprintNode', { x: 150, y: 330 }, {
      title: 'Debug Message',
      nodeType: 'variable',
      inputs: [],
      outputs: [
        { name: 'Value', type: 'string' },
      ],
      description: cleanMessage,
    }),
    
    // Delay node
    createNode('node-5', 'blueprintNode', { x: 550, y: 150 }, {
      title: 'Delay',
      nodeType: 'function',
      inputs: [
        { name: 'Execute', type: 'exec' },
        { name: 'Duration', type: 'float' },
      ],
      outputs: [
        { name: 'Execute', type: 'exec' },
      ],
    }),
    
    // Delay Time variable
    createNode('node-6', 'blueprintNode', { x: 450, y: 250 }, {
      title: 'Delay Time',
      nodeType: 'variable',
      inputs: [],
      outputs: [
        { name: 'Value', type: 'float' },
      ],
    }),
  ];
  
  const edges: Edge[] = [
    // Connect BeginPlay to Print String
    createEdge('node-1', 'Event', 'node-2', 'Execute', 'exec'),
    
    // Connect Print String to Delay
    createEdge('node-2', 'Execute', 'node-5', 'Execute', 'exec'),
    
    // Connect Player Character to Print String
    createEdge('node-3', 'Return Value', 'node-2', 'Target', 'object'),
    
    // Connect Debug Message to Print String
    createEdge('node-4', 'Value', 'node-2', 'String', 'string'),
    
    // Connect Delay Time to Delay
    createEdge('node-6', 'Value', 'node-5', 'Duration', 'float'),
  ];
  
  return {
    name: 'Sample Blueprint',
    description: 'A sample blueprint demonstrating print functionality',
    nodes,
    edges,
  };
}; 