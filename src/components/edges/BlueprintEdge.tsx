import React, { memo } from 'react';
import { EdgeProps, getBezierPath, Position } from 'reactflow';

// Define the props interface
interface BlueprintEdgeProps extends EdgeProps {
  data?: {
    label?: string;
  };
}

// Define the edge component using standard JSX
const BlueprintEdge = memo<BlueprintEdgeProps>(({ 
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  style = {},
  markerEnd,
  data,
  className,
}) => {

  // Get the bezier path points
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine edge type from class name
  const isExec = className?.includes('exec');
  const isPinType = className?.split('-')[1];

  // Use proto colors for edges
  const pinColorMap: Record<string, string> = {
    exec: 'var(--tw-color-proto-pin-exec)', 
    bool: 'var(--tw-color-proto-pin-bool)',
    int: 'var(--tw-color-proto-pin-int)',
    float: 'var(--tw-color-proto-pin-float)',
    string: 'var(--tw-color-proto-pin-string)',
    vector: 'var(--tw-color-proto-pin-vector)',
    object: 'var(--tw-color-proto-pin-object)',
    default: '#aaaaaa', // Fallback
  };

  // Build edge style
  const edgeStyle = {
    ...style,
    strokeWidth: 2, // Prototype edge width
    stroke: pinColorMap[isPinType as keyof typeof pinColorMap] || pinColorMap.default,
  };

  return (
    <>
      <path
        id={id}
        className={`react-flow__edge-path ${className || ''}`}
        d={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
      />
      {data?.label && (
        <foreignObject
          width={100}
          height={40}
          // Center the label text on the path
          x={labelX - 50}
          y={labelY - 20}
          className="react-flow__edge-textwrapper"
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div className="react-flow__edge-text bg-proto-node-bg p-1 rounded text-xs text-proto-input-text">
            {data.label}
          </div>
        </foreignObject>
      )}
    </>
  );
});

BlueprintEdge.displayName = 'BlueprintEdge';

export default BlueprintEdge; 