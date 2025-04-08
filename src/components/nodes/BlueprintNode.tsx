import React, { memo } from 'react';
import { Handle, Position, NodeProps, useEdges } from 'reactflow';
import { NodeData, PinType } from '../../types/BlueprintTypes';

// Helper function to generate unique handle IDs - Moved outside
const getPinId = (pinType: PinType, pinName: string): string => {
  const processedName = pinName.replace(/\s+|[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  return `${pinType}-${processedName}`;
};

// Helper for pin color class - Moved outside
const getPinColorClass = (pinType: PinType): string => {
  switch (pinType) {
    case 'exec': return 'border-gray-400 hover:border-white'; // Exec pins often just use shape/border
    case 'bool': return 'border-red-500 hover:border-red-300';
    case 'float': return 'border-green-500 hover:border-green-300';
    case 'int': return 'border-teal-400 hover:border-teal-200';
    case 'string': return 'border-purple-500 hover:border-purple-300';
    case 'vector': return 'border-yellow-500 hover:border-yellow-300'; // Or blue often for vectors
    case 'object': return 'border-blue-500 hover:border-blue-300'; // Object references
    default: return 'border-gray-500 hover:border-gray-300';
  }
};

const BlueprintNode: React.FC<NodeProps<NodeData>> = memo(({ data, selected, id }) => {
  // Get edges using the correct hook
  const edges = useEdges();

  // Use color from data, default if not provided
  const nodeColor = data.color || '#1E293B'; // Slightly blue-tinted dark
  const headerStyle = {
    backgroundColor: nodeColor,
    color: '#ffffff'
  };
  const borderClass = selected ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-gray-700/50';

  return (
    <div className={`blueprint-node bg-gray-900/90 backdrop-blur-sm text-white rounded-lg border ${borderClass} overflow-hidden min-w-[220px] transition-all duration-200 hover:shadow-xl`}>
      {/* Node Header */}
      <div
        className="node-header px-3 py-2.5 font-medium text-sm truncate flex items-center justify-between"
        style={headerStyle}
      >
        <span className="truncate">{data.title}</span>
        {data.subtitle && (
          <span className="text-xs text-gray-300/70 truncate">{data.subtitle}</span>
        )}
      </div>

      {/* Pins Container */}
      <div className="flex justify-between px-2 py-3 bg-gradient-to-b from-gray-800/80 to-gray-900/80"> 
        {/* Input Pins */}
        <div className="pins pins-input p-1 space-y-2.5"> 
          {data.inputs && data.inputs.map((pin) => {
            const handleId = getPinId(pin.type, pin.name);
            // Determine if this input pin has an incoming connection
            const isConnected = edges.some(edge => edge.target === id && edge.targetHandle === handleId);
            const showValue = pin.value !== undefined && pin.value !== null && !isConnected;

            return (
              <div key={handleId} className="pin flex items-center text-xs relative group"> 
                <Handle
                  type="target"
                  position={Position.Left}
                  id={handleId}
                  className={`w-3 h-3 !bg-gray-800 border-2 rounded-full ${getPinColorClass(pin.type)} transition-all duration-200 shadow-sm shadow-black/40`}
                />
                {/* Text and Value */}
                <div className="ml-3 flex items-baseline"> 
                  <span className="text-gray-300 group-hover:text-white transition-colors">{pin.name}</span>
                  {/* Display value if not connected and value exists */}
                  {showValue && (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 text-[9px] font-mono shadow-inner shadow-black/30"> 
                      {typeof pin.value === 'boolean' ? (pin.value ? 'true' : 'false') :
                       typeof pin.value === 'object' ? JSON.stringify(pin.value) : 
                       String(pin.value)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Output Pins */}
        <div className="pins pins-output p-1 space-y-2.5 flex flex-col items-end"> 
          {data.outputs && data.outputs.map((pin) => {
            const handleId = getPinId(pin.type, pin.name);
            return (
              <div key={handleId} className="pin flex items-center justify-end text-xs relative group"> 
                 {/* Text */}
                 <span className="mr-3 text-gray-300 group-hover:text-white transition-colors">{pin.name}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={handleId}
                  className={`w-3 h-3 !bg-gray-800 border-2 rounded-full ${getPinColorClass(pin.type)} transition-all duration-200 shadow-sm shadow-black/40`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Optional node description/comment */}
      {data.description && (
        <div className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-800/50 bg-gray-900/40">
          {data.description}
        </div>
      )}
    </div>
  );
});

BlueprintNode.displayName = 'BlueprintNode';

export default BlueprintNode;