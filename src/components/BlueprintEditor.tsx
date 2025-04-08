import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Panel,
  ReactFlowProvider,
  NodeTypes,
  EdgeTypes,
  Position,
  Background,
  BackgroundVariant,
  Controls,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  LuArrowLeft, 
  LuDownload, 
  LuSave, 
  LuTrash2, 
  LuFolderArchive, 
  LuMenu,
  LuFolder,
  LuFolderPlus,
  LuFilePlus,
  LuFile,
  LuChevronRight,
  LuChevronDown,
  LuTrash,
  LuPencil,
  LuLoader,
  LuX
} from 'react-icons/lu';
import BlueprintNode from './nodes/BlueprintNode';
import BlueprintEdge from './edges/BlueprintEdge';
import { NLPInput } from './NLPInput';
import { useBlueprintStore } from '../store/blueprintStore';
import { useBlueprint } from '../hooks/useBlueprint';
import { BlueprintGenerationService } from '../services/blueprintGenerationService';
import { useProjectStore } from '../store/projectStore';
import { useFileSystemStore } from '../store/fileSystemStore';
import { useAuth } from '../contexts/AuthContext';

// Define custom node types
const nodeTypes: NodeTypes = {
  blueprintNode: BlueprintNode,
};

// Define custom edge types
const edgeTypes: EdgeTypes = {
  default: BlueprintEdge,
};

// Sample file system structure for the file explorer
// TODO: Replace with database-backed storage in the future
// We should use a real database (Firebase/MongoDB) to store file structures
// This will allow for persistent storage across sessions and real-time collaboration
interface FileSystemItem {
  id: string;         // Will be the document ID in the database
  name: string;       // Display name
  type: 'file' | 'folder';
  children?: FileSystemItem[]; // For folders - will be references or sub-collection in DB
  content?: string;   // For files - consider storing larger files in a separate collection/bucket
  isOpen?: boolean;   // UI state - could be stored in user preferences collection
  createdAt?: Date;   // For sorting and tracking
  updatedAt?: Date;   // For sorting and tracking
  createdBy?: string; // User reference for multi-user systems
}

export const BlueprintEditor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(window.innerWidth > 768); // Default to open on desktop, closed on mobile
  const [fileSystem, setFileSystem] = useState<FileSystemItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [isArranging, setIsArranging] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Access blueprint store
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    blueprintName,
    blueprintDescription,
    isLoading,
    setSelectedNodes,
    setSelectedEdges,
    setIsLoading,
    loadBlueprint,
    clearBlueprint,
  } = useBlueprintStore();

  // Access project store to get project name
  const { projects } = useProjectStore();
  
  // Access file system store
  const {
    hierarchicalFiles,
    isLoading: isLoadingFiles,
    error: fileSystemError,
    selectedFileId: currentSelectedFileId,
    fetchFiles,
    createFile,
    deleteFile,
    updateFile,
    selectFile,
    toggleFolder,
    setupRealtimeUpdates,
    cleanupRealtimeUpdates
  } = useFileSystemStore();
  
  // Get the current project name
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === projectId);
  }, [projects, projectId]);
  
  // Setup file system real-time updates when component mounts
  useEffect(() => {
    if (projectId) {
      setupRealtimeUpdates(projectId);
      fetchFiles(projectId);
    }
    
    // Cleanup subscription when component unmounts
    return () => {
      cleanupRealtimeUpdates();
    };
  }, [projectId, setupRealtimeUpdates, fetchFiles, cleanupRealtimeUpdates]);
  
  // Track previous node count to detect new nodes
  const prevNodeCountRef = useRef(nodes.length);
  
  // Use blueprint hook
  const { exportBlueprint } = useBlueprint();
  
  // Auto create a file from AI output
  const createFileFromAIOutput = useCallback((blueprintData: any) => {
    if (!blueprintData || !blueprintData.name || !currentUser || !projectId) return;
    
    // Determine appropriate folder category based on blueprint content/purpose
    let folderName: string | null = null;
    
    // Check blueprint name and description for keywords
    const blueprintText = (blueprintData.name + ' ' + (blueprintData.description || '')).toLowerCase();
    
    if (blueprintText.includes('player') || blueprintText.includes('character') || blueprintText.includes('movement')) {
      folderName = 'Character Blueprints';
    } else if (blueprintText.includes('enemy') || blueprintText.includes('ai') || blueprintText.includes('npc')) {
      folderName = 'AI Blueprints';
    } else if (blueprintText.includes('ui') || blueprintText.includes('interface') || blueprintText.includes('menu')) {
      folderName = 'UI Blueprints';
    } else if (blueprintText.includes('item') || blueprintText.includes('pickup') || blueprintText.includes('weapon')) {
      folderName = 'Item Blueprints';
    } else if (blueprintText.includes('game') && (blueprintText.includes('manager') || blueprintText.includes('controller'))) {
      folderName = 'Game Management';
    } else if (blueprintText.includes('util') || blueprintText.includes('helper')) {
      folderName = 'Utility Blueprints';
    } else {
      folderName = 'Miscellaneous Blueprints';
    }
    
    // Look for existing folder or create one
    const findOrCreateFolder = async () => {
      // Get the current files from the store
      const { files } = useFileSystemStore.getState();
      
      // Look for an existing folder with the target name
      const existingFolder = files.find(
        f => f.type === 'folder' && f.name === folderName && !f.parentId
      );
      
      if (existingFolder) {
        return existingFolder.id!;
      } else {
        // Create a new folder
        const newFolder = await createFile({
          name: folderName!,
          type: 'folder',
          content: '',
          projectId,
          userId: currentUser.uid,
          isOpen: true,
          children: []
        });
        
        return newFolder.id!;
      }
    };
    
    // Create the actual file
    const createBlueprintFile = async (parentFolderId: string) => {
      const newFile = await createFile({
        name: `${blueprintData.name.replace(/\s+/g, '')}.ueblueprint`,
        content: JSON.stringify(blueprintData, null, 2),
        type: 'file',
        projectId,
        parentId: parentFolderId,
        userId: currentUser.uid
      });
      
      // Select the new file
      selectFile(newFile.id);
      
      return newFile.id;
    };
    
    // Execute the file creation process
    findOrCreateFolder()
      .then(folderId => createBlueprintFile(folderId))
      .then(fileId => {
        console.log(`Created blueprint file: ${fileId}`);
      })
      .catch(error => {
        console.error('Error creating blueprint file:', error);
        setErrorMessage('Failed to save blueprint: ' + error.message);
      });
  }, [projectId, currentUser, createFile, selectFile, setErrorMessage]);
  
  // Handle AI generation completion
  const handleGenerationComplete = useCallback((blueprintData: any) => {
    // Create a file from the output
    createFileFromAIOutput(blueprintData);
    
    // Additional handling if needed
    console.log('AI generation completed:', blueprintData.name);
  }, [createFileFromAIOutput]);
  
  // Use effect to watch for changes in blueprint data and auto-create files
  useEffect(() => {
    // If we have nodes and a name but no selected file, create one automatically
    if (nodes.length > 0 && blueprintName && !currentSelectedFileId) {
      createFileFromAIOutput({
        name: blueprintName,
        description: blueprintDescription,
        nodes,
        edges
      });
    }
  }, [nodes.length, blueprintName, currentSelectedFileId, edges, createFileFromAIOutput, blueprintDescription]);
  
  // Handle loading state
  const handleLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, [setIsLoading]);
  
  // Handle node selection
  const onSelectionChange = useCallback(({ nodes, edges }) => {
    setSelectedNodes(nodes);
    setSelectedEdges(edges);
  }, [setSelectedNodes, setSelectedEdges]);
  
  // Handle errors
  const handleError = useCallback((message: string | null) => {
    setErrorMessage(message);
    if (message) {
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    }
  }, []);
  
  // Handle exporting
  const handleExport = useCallback(async () => {
    try {
      setIsLoading(true);
      const blueprint = exportBlueprint();
      
      // Generate export data
      const exportData = await BlueprintGenerationService.exportToUnreal(blueprint);
      
      // Create a blob and download link
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${blueprint.name.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setIsLoading(false);
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      handleError('Failed to export blueprint');
      setIsLoading(false);
    }
  }, [exportBlueprint, setIsLoading, handleError]);
  
  // Create save template handler
  const handleSaveTemplate = useCallback(async () => {
    try {
      setIsLoading(true);
      const blueprint = exportBlueprint();
      
      // Save as template
      await BlueprintGenerationService.saveAsTemplate(blueprint);
      
      setIsLoading(false);
      setIsMenuOpen(false);
      console.log('Blueprint saved as template');
    } catch (error) {
      console.error('Save template failed:', error);
      handleError('Failed to save blueprint as template');
      setIsLoading(false);
    }
  }, [exportBlueprint, setIsLoading, handleError]);

  // Handle clear canvas
  const handleClearCanvas = useCallback(() => {
    if (window.confirm('Are you sure you want to clear the canvas? All unsaved work will be lost.')) {
      clearBlueprint();
      setIsMenuOpen(false);
    }
  }, [clearBlueprint]);

  // Handle file selection
  const handleFileSelect = (fileId: string) => {
    // Toggle selection if already selected
    if (currentSelectedFileId === fileId) {
      selectFile(null);
      return;
    }
    
    // Otherwise, select the file
    selectFile(fileId);
    
    // Get file from the store
    const { files } = useFileSystemStore.getState();
    const file = files.find(f => f.id === fileId);
    
    if (file && file.type === 'file' && file.content) {
      try {
        // Parse the blueprint data from the file content
        const blueprintData = JSON.parse(file.content);
        
        // Automatically load the blueprint into the editor
        clearBlueprint(); // Clear first to avoid mixing nodes
        setTimeout(() => {
          loadBlueprint(blueprintData);
          // Show success message
          setSuccessMessage(`Loaded ${file.name}`);
          // Clear success message after 3 seconds
          setTimeout(() => {
            setSuccessMessage(null);
          }, 3000);
        }, 50); // Small delay to ensure clear happens first
      } catch (error) {
        console.error('Error parsing blueprint data:', error);
        setErrorMessage('Failed to load blueprint: Invalid file format');
      }
    }
  };

  // Start UI for creating a new file
  const handleCreateFileUI = (parentId: string | null) => {
    setIsCreatingFile(true);
    setIsCreatingFolder(false);
    setNewItemName('');
    setEditingParentId(parentId);
  };

  // Start UI for creating a new folder
  const handleCreateFolderUI = (parentId: string | null) => {
    setIsCreatingFolder(true);
    setIsCreatingFile(false); 
    setNewItemName('');
    setEditingParentId(parentId);
  };

  // Create a new file or folder from UI
  const handleCreateItem = async () => {
    if (!newItemName.trim() || !currentUser || !projectId) return;
    
    try {
      setIsLoading(true);
      
      if (isCreatingFile) {
        // Create a new file
        await createFile({
          name: newItemName.trim().endsWith('.ueblueprint') 
            ? newItemName.trim() 
            : `${newItemName.trim()}.ueblueprint`,
          content: JSON.stringify({
            name: newItemName.trim(),
            description: "",
            nodes: [],
            edges: []
          }, null, 2),
          type: 'file',
          projectId,
          parentId: editingParentId,
          userId: currentUser.uid
        });
      } else if (isCreatingFolder) {
        // Create a new folder
        await createFile({
          name: newItemName.trim(),
          content: '',
          type: 'folder',
          projectId,
          parentId: editingParentId,
          userId: currentUser.uid,
          children: []
        });
      }
    } catch (error) {
      console.error('Error creating item:', error);
      setErrorMessage('Failed to create item: ' + (error as any).message);
    } finally {
      setIsLoading(false);
      setIsCreatingFile(false);
      setIsCreatingFolder(false);
      setNewItemName('');
      setEditingParentId(null);
    }
  };

  // Delete a file or folder
  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        setIsLoading(true);
        await deleteFile(itemId);
        
        if (currentSelectedFileId === itemId) {
          selectFile(null);
          clearBlueprint();
        }
      } catch (error) {
        console.error('Error deleting item:', error);
        setErrorMessage('Failed to delete item: ' + (error as any).message);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Get proactiveDefaultViewport that shows all nodes
  const proactiveDefaultViewport = useMemo(() => {
    if (!nodes.length) return { x: 0, y: 0, zoom: 1 };
    
    // Calculate viewport that contains all nodes with padding
    const padding = 100; // Increased padding for better spacing
    const nodePositions = nodes.map(node => node.position);
    
    const minX = Math.min(...nodePositions.map(pos => pos.x)) - padding;
    const minY = Math.min(...nodePositions.map(pos => pos.y)) - padding;
    const maxX = Math.max(...nodePositions.map(pos => pos.x + 200)) + padding;
    const maxY = Math.max(...nodePositions.map(pos => pos.y + 100)) + padding;
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Calculate zoom level to fit all nodes with a slightly reduced zoom for better overview
    const zoom = Math.min(
      typeof window !== 'undefined' ? (window.innerWidth / width) * 0.9 : 1,
      typeof window !== 'undefined' ? (window.innerHeight / height) * 0.9 : 1,
      1 // Max zoom level
    );
    
    const viewWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const viewHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    
    // Better centering calculation
    return {
      x: minX * zoom * -1 + (viewWidth - width * zoom) / 2,
      y: minY * zoom * -1 + (viewHeight - height * zoom) / 2.5, // Adjusted for better vertical position
      zoom,
    };
  }, [nodes]);

  // Handle auto-arrange nodes in a grid layout
  const handleAutoArrangeNodes = useCallback(() => {
    if (!nodes.length || isLoading) return;
    
    setIsArranging(true);
    
    // Create a copy of the nodes for arranging
    const nodesCopy = [...nodes];
    
    // Define grid parameters
    const nodeWidth = 200;
    const nodeHeight = 100;
    const horizontalGap = 50;
    const verticalGap = 100;
    const nodesPerRow = Math.ceil(Math.sqrt(nodesCopy.length));
    
    // Arrange nodes in a grid
    const arrangedNodes = nodesCopy.map((node, index) => {
      const row = Math.floor(index / nodesPerRow);
      const col = index % nodesPerRow;
      
      return {
        ...node,
        position: {
          x: col * (nodeWidth + horizontalGap),
          y: row * (nodeHeight + verticalGap),
        },
      };
    });
    
    // Update nodes in the store
    useBlueprintStore.getState().setNodes(arrangedNodes);
    
    // Add timeout to allow for animation to complete
    setTimeout(() => {
      setIsArranging(false);
    }, 500);
  }, [nodes, isLoading]);

  // Recursive function to render the file system
  const renderFileSystem = (items: any[]) => {
    return items.map(item => (
      <div key={item.id} className="pl-1.5 group">
        <div 
          className={`flex items-center py-1.5 px-2 text-sm rounded-md hover:bg-gray-800/60 transition-colors ${
            currentSelectedFileId === item.id ? 'bg-blue-800/40 text-white border-l-2 border-blue-400' : 'text-gray-300'
          }`}
        >
          {item.type === 'folder' ? (
            <>
              <button 
                onClick={() => toggleFolder(item.id)} 
                className="p-1 mr-1.5 hover:bg-gray-700/70 rounded-sm transition-colors"
              >
                {item.isOpen ? 
                  <LuChevronDown size={14} className="text-blue-400" /> : 
                  <LuChevronRight size={14} className="text-blue-400" />
                }
              </button>
              <LuFolder className={`mr-2 ${item.isOpen ? 'text-blue-400' : 'text-blue-500/70'}`} size={16} />
              <span className="flex-1 truncate font-medium">{item.name}</span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex">
                <button 
                  className="p-1 hover:bg-gray-700/70 hover:text-blue-300 rounded-sm transition-all"
                  onClick={() => handleCreateFileUI(item.id)}
                  title="New File"
                >
                  <LuFilePlus size={14} />
                </button>
                <button 
                  className="p-1 hover:bg-gray-700/70 hover:text-blue-300 rounded-sm transition-all"
                  onClick={() => handleCreateFolderUI(item.id)}
                  title="New Folder"
                >
                  <LuFolderPlus size={14} />
                </button>
                <button 
                  className="p-1 hover:bg-red-900/30 hover:text-red-300 rounded-sm transition-all"
                  onClick={() => handleDeleteItem(item.id)}
                  title="Delete"
                >
                  <LuTrash size={14} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-5 mr-1.5 pl-1 opacity-0">
                {/* Spacer to align with folders */}
              </div>
              <LuFile className={`mr-2 ${currentSelectedFileId === item.id ? 'text-blue-400' : 'text-blue-500/60'}`} size={16} />
              <span 
                className="flex-1 truncate cursor-pointer hover:text-white"
                onClick={() => handleFileSelect(item.id)}
              >
                {item.name}
              </span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center">
                <button 
                  className="p-1 hover:bg-red-900/30 hover:text-red-300 rounded-sm transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteItem(item.id);
                  }}
                  title="Delete"
                >
                  <LuTrash size={14} />
                </button>
              </div>
            </>
          )}
        </div>
        
        {item.type === 'folder' && item.isOpen && item.childrenObjects && (
          <div className="ml-3 border-l border-gray-700/40 pl-2 mt-1 mb-1">
            {renderFileSystem(item.childrenObjects)}
          </div>
        )}
      </div>
    ));
  };

  // Use effect to auto-arrange nodes when they change
  useEffect(() => {
    // Only auto-arrange if number of nodes increased (new nodes added)
    // and not during loading or current arrangement
    if (nodes.length > prevNodeCountRef.current && !isLoading && !isArranging) {
      handleAutoArrangeNodes();
    }
    
    // Update the previous count reference
    prevNodeCountRef.current = nodes.length;
  }, [nodes.length, handleAutoArrangeNodes, isLoading, isArranging]);

  // Handle window resize to adjust side panel visibility
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidePanelOpen(true);
      } else {
        setIsSidePanelOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#070B15] text-white overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between p-4 bg-[#0A0F1C] border-b border-gray-800">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(`/projects/${projectId}`)}
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            <LuArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">{projectName || 'Blueprint Editor'}</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            className="p-2 rounded-full bg-blue-900/30 hover:bg-blue-800/40 text-gray-300 hover:text-white transition-all duration-300 border border-blue-700/30 hover:border-blue-600/40 shadow-sm"
            title={isSidePanelOpen ? "Hide Side Panel" : "Show Side Panel"}
          >
            {isSidePanelOpen ? <LuChevronRight size={20} /> : <LuChevronDown size={20} />}
          </button>
          
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            <LuMenu size={20} />
          </button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Side Panel */}
        <div 
          className={`${
            isSidePanelOpen ? 'w-64 md:w-72' : 'w-0'
          } transition-all duration-300 ease-in-out overflow-hidden bg-[#0A0F1C] border-r border-gray-800 flex flex-col`}
        >
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold mb-2">File Explorer</h2>
            <div className="flex space-x-2">
              <button 
                onClick={() => handleCreateFolderUI(null)}
                className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                title="New Folder"
              >
                <LuFolderPlus size={18} />
              </button>
              <button 
                onClick={() => handleCreateFileUI(null)}
                className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                title="New File"
              >
                <LuFilePlus size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {renderFileSystem(hierarchicalFiles)}
          </div>
        </div>
        
        {/* Blueprint Editor */}
        <div className="flex-1 relative">
          <ReactFlowProvider>
            <div className="w-full h-full">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                attributionPosition="bottom-right"
                onNodeClick={(_, node) => setSelectedNodes([node])}
                onEdgeClick={(_, edge) => setSelectedEdges([edge])}
                onPaneClick={() => {
                  setSelectedNodes([]);
                  setSelectedEdges([]);
                }}
              >
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#444" />
                <Controls />
                
                {/* NLP Input Panel */}
                <Panel position="top-right" className="m-4">
                  <NLPInput onGenerate={handleGenerationComplete} />
                </Panel>
                
                {/* Action Buttons */}
                <Panel position="bottom-right" className="m-4 flex flex-col space-y-2">
                  <button
                    onClick={handleSaveTemplate}
                    className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg"
                    title="Save Blueprint"
                  >
                    <LuSave size={20} />
                  </button>
                  <button
                    onClick={handleExport}
                    className="p-2 rounded-full bg-green-600 hover:bg-green-700 transition-colors shadow-lg"
                    title="Export Blueprint"
                  >
                    <LuDownload size={20} />
                  </button>
                  <button
                    onClick={handleClearCanvas}
                    className="p-2 rounded-full bg-red-600 hover:bg-red-700 transition-colors shadow-lg"
                    title="Delete Blueprint"
                  >
                    <LuTrash2 size={20} />
                  </button>
                </Panel>
                
                {/* Loading Overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="flex flex-col items-center">
                      <LuLoader className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                      <p className="text-white">Generating Blueprint...</p>
                    </div>
                  </div>
                )}
              </ReactFlow>
            </div>
          </ReactFlowProvider>
        </div>
      </div>
      
      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-[#0A0F1C] rounded-lg p-6 w-11/12 max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Blueprint Actions</h2>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-800 transition-colors"
              >
                <LuX size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => {
                  handleSaveTemplate();
                  setIsMenuOpen(false);
                }}
                className="w-full p-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <LuSave size={18} />
                <span>Save Blueprint</span>
              </button>
              
              <button
                onClick={() => {
                  handleExport();
                  setIsMenuOpen(false);
                }}
                className="w-full p-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <LuDownload size={18} />
                <span>Export Blueprint</span>
              </button>
              
              <button
                onClick={() => {
                  handleClearCanvas();
                  setIsMenuOpen(false);
                }}
                className="w-full p-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
              >
                <LuTrash2 size={18} />
                <span>Delete Blueprint</span>
              </button>
              
              <button
                onClick={() => {
                  setIsArranging(true);
                  setIsMenuOpen(false);
                }}
                className="w-full p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
              >
                <LuFolderArchive size={18} />
                <span>Arrange Nodes</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {errorMessage && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <LuTrash2 size={20} />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium">Error</h3>
              <p className="text-sm mt-1">{errorMessage}</p>
            </div>
            <button 
              onClick={() => setErrorMessage(null)}
              className="ml-4 flex-shrink-0 text-white hover:text-gray-200"
            >
              <LuX size={16} />
            </button>
          </div>
        </div>
      )}
      
      {/* Success Message */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <LuSave size={20} />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium">Success</h3>
              <p className="text-sm mt-1">{successMessage}</p>
            </div>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="ml-4 flex-shrink-0 text-white hover:text-gray-200"
            >
              <LuX size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 