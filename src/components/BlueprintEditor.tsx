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
import './reactflow-overrides.css'; // Hide ReactFlow attribution
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
  LuX,
  LuLayoutGrid,
  LuSearch
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
import { FileExplorer } from './FileExplorer';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  
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
      if (!currentProject?.name) {
        setErrorMessage('No project selected');
        return;
      }

      const exportData = {
        nodes,
        edges,
        projectName: currentProject.name,
        timestamp: new Date().toISOString()
      };
      
      // Generate export data
      const exportDataBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(exportDataBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject.name.replace(/\s+/g, '_')}_blueprint_export_${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')}.json`;
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
  }, [nodes, edges, currentProject, setIsLoading, handleError]);
  
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
        
        // Show success message
        setSuccessMessage(`Created file: ${newItemName.trim()}`);
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
        
        // Show success message
        setSuccessMessage(`Created folder: ${newItemName.trim()}`);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
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
        
        // Show success message
        setSuccessMessage('Item deleted successfully');
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
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

  // Filter files based on search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery) return hierarchicalFiles;
    
    const searchLower = searchQuery.toLowerCase();
    const filterItems = (items: any[]): any[] => {
      return items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchLower);
        if (item.type === 'folder' && item.childrenObjects) {
          const matchingChildren = filterItems(item.childrenObjects);
          item.childrenObjects = matchingChildren;
          return matchesSearch || matchingChildren.length > 0;
        }
        return matchesSearch;
      });
    };
    
    return filterItems([...hierarchicalFiles]);
  }, [hierarchicalFiles, searchQuery]);

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    itemId: string | null;
    itemType: 'file' | 'folder' | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    itemId: null,
    itemType: null
  });

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, itemId: string, itemType: 'file' | 'folder') => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      itemId,
      itemType
    });
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      itemId: null,
      itemType: null
    });
  };

  // Handle context menu action
  const handleContextMenuAction = (action: string) => {
    if (!contextMenu.itemId) return;
    
    switch (action) {
      case 'newFile':
        handleCreateFileUI(contextMenu.itemId);
        break;
      case 'newFolder':
        handleCreateFolderUI(contextMenu.itemId);
        break;
      case 'delete':
        handleDeleteItem(contextMenu.itemId);
        break;
      case 'rename':
        // TODO: Implement rename functionality
        break;
    }
    
    closeContextMenu();
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        closeContextMenu();
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.visible]);

  // Recursive function to render the file system
  const renderFileSystem = (items: any[]) => {
    return items.map(item => (
      <div key={item.id} className="mb-1 group">
        <div 
          className={`flex items-center py-2 px-3 text-sm rounded-md transition-all duration-200 ${
            currentSelectedFileId === item.id 
              ? 'bg-blue-900/40 text-white border-l-2 border-blue-400 shadow-sm' 
              : 'text-gray-300 hover:bg-gray-800/40'
          }`}
          onContextMenu={(e) => handleContextMenu(e, item.id, item.type)}
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
                  className="p-1 hover:bg-gray-700/70 hover:text-blue-300 rounded-sm transition-all"
                  onClick={() => handleContextMenu(new MouseEvent('contextmenu') as any, item.id, 'folder')}
                  title="More Options"
                >
                  <span className="text-xs">•••</span>
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
                  className="p-1 hover:bg-gray-700/70 hover:text-blue-300 rounded-sm transition-all"
                  onClick={() => handleContextMenu(new MouseEvent('contextmenu') as any, item.id, 'file')}
                  title="More Options"
                >
                  <span className="text-xs">•••</span>
                </button>
              </div>
            </>
          )}
        </div>
        
        {item.type === 'folder' && item.isOpen && item.childrenObjects && (
          <div className="ml-4 border-l border-gray-700/40 pl-2 mt-1 mb-1">
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
    <div className="flex h-screen bg-[#0A0A0A] text-white">
      <FileExplorer
        projectId={projectId}
        onFileSelect={handleFileSelect}
        selectedFileId={currentSelectedFileId}
        onTogglePanel={setIsPanelOpen}
        isPanelOpen={isPanelOpen}
      />
      
      <div className="flex-1 flex flex-col">
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 relative h-full">
            <ReactFlowProvider>
              <div className="w-full h-full absolute inset-0">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  fitView
                  attribution="false"
                  onNodeClick={(_, node) => setSelectedNodes([node])}
                  onEdgeClick={(_, edge) => setSelectedEdges([edge])}
                  onPaneClick={() => {
                    setSelectedNodes([]);
                    setSelectedEdges([]);
                  }}
                  className="bg-[#0A0A0A]"
                  style={{ '--rf-attribution-display': 'none' } as React.CSSProperties}
                >
                  <Background variant={BackgroundVariant.Lines} gap={30} size={1} color="#1A1A1A" />
                  
                  {/* NLP Input Panel */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-2xl px-4">
                    <NLPInput onGenerate={handleGenerationComplete} />
                  </div>
                  
                  {/* Beta Indicator */}
                  <div className="absolute top-4 right-4 z-10">
                    <div className="px-2 py-1 text-xs font-sans font-medium tracking-wider bg-[#1A1A1A] text-[#4dabf7] border border-[#4dabf7]/30 rounded-md">
                      Beta 1.0
                    </div>
                  </div>
                  
                  {/* Floating Menu and Toggle Button */}
                  {!isSidePanelOpen && (
                    <div className="absolute top-4 left-4 flex flex-col space-y-2 z-10">
                      <button
                        onClick={() => setIsSidePanelOpen(true)}
                        className="p-2 rounded-full bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#4dabf7] hover:text-white transition-all duration-300 border border-[#4dabf7]/30 hover:border-[#4dabf7]/50 shadow-lg"
                        title="Show Panel"
                      >
                        <LuChevronRight size={20} />
                      </button>
                      <button
                        onClick={() => setIsMenuOpen(true)}
                        className="p-2 rounded-full bg-[#1A1A1A] hover:bg-[#2A2A2A] transition-colors shadow-lg md:hidden"
                        title="Menu"
                      >
                        <LuMenu size={20} />
                      </button>
                      <button
                        onClick={() => navigate('/projects')}
                        className="p-2 rounded-full bg-[#1A1A1A] hover:bg-[#2A2A2A] transition-colors shadow-lg"
                        title="Back to Projects"
                      >
                        <LuArrowLeft size={20} />
                      </button>
                    </div>
                  )}
                  
                  {/* Loading Overlay */}
                  {isLoading && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                      <div className="flex flex-col items-center">
                        <LuLoader className="w-8 h-8 text-[#4dabf7] animate-spin mb-2" />
                        <p className="text-white font-sans tracking-wide">Generating Blueprint...</p>
                      </div>
                    </div>
                  )}
                </ReactFlow>
              </div>
            </ReactFlowProvider>
          </div>
        </div>
        
        {/* Context Menu */}
        {contextMenu.visible && (
          <div 
            className="fixed z-50 bg-[#1A1A1A] border border-[#333] rounded-md shadow-lg py-1 min-w-[160px]"
            style={{ 
              top: contextMenu.y, 
              left: contextMenu.x,
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto'
            }}
          >
            {contextMenu.itemType === 'folder' && (
              <>
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2A2A2A] flex items-center"
                  onClick={() => handleContextMenuAction('newFile')}
                >
                  <LuFilePlus size={14} className="mr-2 text-[#4dabf7]" />
                  New File
                </button>
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2A2A2A] flex items-center"
                  onClick={() => handleContextMenuAction('newFolder')}
                >
                  <LuFolderPlus size={14} className="mr-2 text-[#4dabf7]" />
                  New Folder
                </button>
                <div className="border-t border-[#333] my-1"></div>
              </>
            )}
            <button 
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2A2A2A] flex items-center"
              onClick={() => handleContextMenuAction('rename')}
            >
              <LuPencil size={14} className="mr-2 text-[#4dabf7]" />
              Rename
            </button>
            <button 
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 flex items-center"
              onClick={() => handleContextMenuAction('delete')}
            >
              <LuTrash size={14} className="mr-2" />
              Delete
            </button>
          </div>
        )}
        
        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 md:hidden">
            <div className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-[#333] p-4 rounded-t-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-sans font-medium tracking-wide">Actions</h3>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-full bg-[#1A1A1A] hover:bg-[#2A2A2A] transition-colors"
                >
                  <LuX size={20} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleSaveTemplate}
                  className="flex items-center justify-center space-x-2 p-3 rounded-lg bg-[#4dabf7] hover:bg-[#3a8ac4] transition-colors font-sans tracking-wide"
                >
                  <LuSave size={20} />
                  <span>Save</span>
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center justify-center space-x-2 p-3 rounded-lg bg-[#4dabf7] hover:bg-[#3a8ac4] transition-colors font-sans tracking-wide"
                >
                  <LuDownload size={20} />
                  <span>Export</span>
                </button>
                <button
                  onClick={handleClearCanvas}
                  className="flex items-center justify-center space-x-2 p-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors font-sans tracking-wide"
                >
                  <LuTrash2 size={20} />
                  <span>Delete</span>
                </button>
                <button
                  onClick={handleAutoArrangeNodes}
                  className="flex items-center justify-center space-x-2 p-3 rounded-lg bg-[#1A1A1A] hover:bg-[#2A2A2A] transition-colors font-sans tracking-wide"
                >
                  <LuLayoutGrid size={20} />
                  <span>Arrange</span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {errorMessage && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-md">
            <div className="flex items-start space-x-3">
              <div className="flex-1">
                <p className="font-sans font-medium tracking-wide">Error</p>
                <p className="text-sm font-sans tracking-wide mt-1">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="flex-shrink-0 p-1 hover:bg-red-700 rounded-full transition-colors"
              >
                <LuX size={16} />
              </button>
            </div>
          </div>
        )}
        
        {/* Success Message */}
        {successMessage && (
          <div className="fixed bottom-4 right-4 bg-[#4dabf7] text-white p-4 rounded-lg shadow-lg z-50 max-w-md">
            <div className="flex items-start space-x-3">
              <div className="flex-1">
                <p className="font-sans font-medium tracking-wide">Success</p>
                <p className="text-sm font-sans tracking-wide mt-1">{successMessage}</p>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="flex-shrink-0 p-1 hover:bg-[#3a8ac4] rounded-full transition-colors"
              >
                <LuX size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 