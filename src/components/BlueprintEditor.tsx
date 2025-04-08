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
  LuLoader
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
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
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

  return (
    <div className="w-full h-screen flex bg-[#0A0F1C] overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 bg-gradient-radial-to-tr from-primary-900/30 via-[#0A0F1C] to-secondary-900/20 z-0"></div>
      <div className="fixed inset-0 opacity-30 z-0" style={{ 
        backgroundImage: 'radial-gradient(rgba(66, 165, 245, 0.1) 1px, transparent 1px)', 
        backgroundSize: '50px 50px'
      }}></div>
      
      {/* Side Panel */}
      <div className={`bg-gradient-to-b from-[#0A0F1C] to-[#0F1521] backdrop-blur-sm border-r border-gray-700/40 shadow-xl h-full z-10 transition-all duration-300 overflow-hidden ${isSidePanelOpen ? 'w-64' : 'w-0'}`}>
        <div className={`flex flex-col h-full ${isSidePanelOpen ? '' : 'hidden'}`}>
          {/* Side Panel Header */}
          <div className="flex flex-col border-b border-gray-700/40 bg-[#0A0F1C]/80">
            {/* Project Title */}
            <div className="p-3 pb-1">
              <h2 className="font-bold text-white text-sm uppercase tracking-wider truncate">
                {currentProject ? currentProject.name : 'Loading Project...'}
              </h2>
              {currentProject?.description && (
                <p className="text-xs text-gray-400 truncate mt-1">{currentProject.description}</p>
              )}
            </div>
            
            {/* Files Header */}
            <div className="flex items-center justify-between p-3 pt-2">
              <div className="flex items-center">
                <LuFolder className="text-blue-400 mr-2.5" />
                <h3 className="font-medium text-white tracking-wide text-xs uppercase">Files</h3>
              </div>
              <div className="flex space-x-1">
                <button 
                  onClick={() => handleCreateFileUI(null)}
                  className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800/70 rounded transition-all duration-150"
                  title="New File"
                >
                  <LuFilePlus size={16} />
                </button>
                <button 
                  onClick={() => handleCreateFolderUI(null)}
                  className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800/70 rounded transition-all duration-150"
                  title="New Folder"
                >
                  <LuFolderPlus size={16} />
                </button>
              </div>
            </div>
          </div>
          
          {/* File Explorer */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* Input for creating new file/folder */}
            {(isCreatingFile || isCreatingFolder) && (
              <div className="mb-3 p-1.5 bg-blue-900/20 rounded-md border border-blue-800/30">
                <div className="flex items-center bg-[#0F1521] rounded overflow-hidden shadow-inner">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder={isCreatingFile ? "New file name" : "New folder name"}
                    className="flex-1 bg-transparent border-none text-white px-3 py-1.5 text-sm focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateItem()}
                    autoFocus
                  />
                  <button 
                    onClick={handleCreateItem}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
            
            {/* File tree */}
            <div className="space-y-1">
              {isLoadingFiles ? (
                <div className="flex justify-center items-center h-32">
                  <LuLoader className="animate-spin text-blue-500 mr-2" size={18} />
                  <span className="text-sm text-gray-400">Loading files...</span>
                </div>
              ) : hierarchicalFiles.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  <p>No blueprints yet</p>
                  <p className="mt-2 text-xs">Use the prompt below to generate a blueprint</p>
                </div>
              ) : (
                renderFileSystem(hierarchicalFiles)
              )}
              
              {fileSystemError && (
                <div className="mt-4 p-3 bg-red-900/30 text-red-200 rounded-md text-xs">
                  {fileSystemError}
                </div>
              )}
            </div>
          </div>
          
          {/* File Preview or Project Navigation based on selection */}
          <div className="p-3 border-t border-gray-700/40 bg-[#0A0F1C]/50">
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:text-white bg-gray-800/30 hover:bg-gray-800/70 rounded-md transition-colors"
            >
              <LuArrowLeft className="mr-2" size={14} />
              <span>Back to Projects</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Toggle Side Panel Button */}
      <button
        onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
        className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-blue-900/30 hover:bg-blue-800/50 text-gray-300 hover:text-white p-1.5 rounded-r-md z-20 border border-transparent border-l-0 border-r-blue-800/40 border-y-blue-800/40 shadow-md transition-all duration-200"
      >
        {isSidePanelOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        )}
      </button>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Floating Action Menu */}
        <div className="absolute top-4 right-4 z-30">
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center justify-center p-3 bg-[#0A0F1C]/90 backdrop-blur-md border border-gray-700/40 rounded-full text-gray-300 hover:text-white hover:border-blue-500/40 transition-all duration-200 hover:shadow-md"
              aria-label="Open menu"
            >
              <LuMenu size={20} />
            </button>
            
            {isMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-0" 
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-[#0A0F1C] border border-gray-700/40 overflow-hidden z-40">
                  <div className="p-1">
                    <button
                      onClick={handleExport}
                      disabled={isLoading || !nodes.length}
                      className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-blue-600/20 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LuDownload className="mr-3" size={16} />
                      Export Blueprint
                    </button>
                    <button
                      onClick={handleSaveTemplate}
                      disabled={isLoading || !nodes.length}
                      className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-blue-600/20 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LuSave className="mr-3" size={16} />
                      Save as Template
                    </button>
                    <button
                      onClick={handleClearCanvas}
                      disabled={isLoading || !nodes.length}
                      className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-red-600/20 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LuTrash2 className="mr-3" size={16} />
                      Clear Canvas
                    </button>
                    <button
                      disabled={true} // Placeholder for future feature
                      className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LuFolderArchive className="mr-3" size={16} />
                      Load Template
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        <ReactFlowProvider>
          <div className="flex-1 relative bg-[#0F1521] overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-gradient-radial from-transparent via-transparent to-black/50 z-10"></div>
            
            {/* File Status Bar */}
            {currentSelectedFileId && (
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-900/30 to-transparent px-4 py-2 z-20 flex items-center">
                <LuFile className="text-blue-400 mr-2" size={16} />
                <div className="flex-1">
                  {(() => {
                    const { files } = useFileSystemStore.getState();
                    const file = files.find(f => f.id === currentSelectedFileId);
                    return file ? (
                      <span className="text-sm text-white">
                        {file.name}
                        <span className="text-xs text-gray-400 ml-2">
                          Last modified: {file.updatedAt 
                            ? new Date((file.updatedAt as any).seconds * 1000).toLocaleDateString() 
                            : 'Unknown'}
                        </span>
                      </span>
                    ) : null;
                  })()}
                </div>
                <button 
                  onClick={() => selectFile(null)}
                  className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800/40"
                  title="Close file"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            )}
            
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultViewport={proactiveDefaultViewport}
              minZoom={0.05}
              maxZoom={4}
              attributionPosition="bottom-left"
              proOptions={{ hideAttribution: true }}
              panOnScroll
              zoomOnScroll
              zoomOnDoubleClick
              zoomOnPinch
            >
              <Background 
                variant={BackgroundVariant.Lines} 
                gap={40}
                size={1} 
                color="rgba(255, 255, 255, 0.07)"
              />
              <Controls className="bg-[#0A0F1C]/80 backdrop-blur-md border border-gray-700/40 rounded-md shadow-lg" />
            </ReactFlow>

            <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-xl px-4">
              <NLPInput 
                onLoading={handleLoading} 
                onError={handleError}
                onGenerationComplete={handleGenerationComplete}
              />
            </div>

            {isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center z-50">
                <div className="w-8 h-8 border-2 border-gray-500 border-t-blue-400 rounded-full animate-spin mb-3"></div>
                <p className="text-sm">Processing...</p>
              </div>
            )}

            {isArranging && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center z-50">
                <div className="w-8 h-8 border-2 border-gray-500 border-t-blue-400 rounded-full animate-spin mb-3"></div>
                <p className="text-sm">Arranging blueprint...</p>
              </div>
            )}

            {errorMessage && (
              <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-red-600 text-white py-2 px-4 rounded-lg flex items-center shadow-lg z-50 min-w-[300px]">
                <p className="flex-1 m-0 text-sm">{errorMessage}</p>
                <button 
                  onClick={() => setErrorMessage(null)} 
                  className="bg-transparent border-none text-white text-lg cursor-pointer pl-4 leading-none"
                >
                  ×
                </button>
              </div>
            )}

            {successMessage && (
              <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white py-2 px-4 rounded-lg flex items-center shadow-lg z-50 min-w-[300px] animate-fade-in">
                <div className="mr-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5"></path>
                  </svg>
                </div>
                <p className="flex-1 m-0 text-sm">{successMessage}</p>
              </div>
            )}
          </div>
        </ReactFlowProvider>
      </div>
    </div>
  );
}; 