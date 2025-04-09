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
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
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
import { auth } from '../services/firebase';

// Define custom node types
const nodeTypes: NodeTypes = {
  customNode: BlueprintNode,
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

// Define props interface for the component
interface BlueprintEditorProps {}

// Button component
interface ButtonProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

const Button = ({ icon, title, onClick, className, disabled }: ButtonProps) => (
  <button
    className={`flex items-center justify-center py-2 px-3 rounded-md text-sm font-sans tracking-wide ${className}`}
    onClick={onClick}
    disabled={disabled}
    title={title}
  >
    <span className="mr-2">{icon}</span>
    <span>{title}</span>
  </button>
);

export const BlueprintEditor: React.FC<BlueprintEditorProps> = () => {
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
    setNodes,
    setEdges,
    setBlueprintName,
    setBlueprintDescription,
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
    // Check if already selected - if so, do nothing
    if (currentSelectedFileId === fileId) {
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
        
        // Use setTimeout to ensure the UI is updated properly
        setTimeout(() => {
          loadBlueprint(blueprintData);
          // Show success message
          setSuccessMessage(`Loaded ${file.name.replace(/\.ueblueprint$/, '')}`);
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
        // Create a new file - always add .ueblueprint extension but don't show in UI
        const fileName = newItemName.trim();
        const fileNameWithExt = fileName.endsWith('.ueblueprint') 
          ? fileName 
          : `${fileName}.ueblueprint`;
          
        await createFile({
          name: fileNameWithExt,
          content: JSON.stringify({
            name: fileName, // Store the name without extension
            description: "",
            nodes: [],
            edges: []
          }, null, 2),
          type: 'file',
          projectId,
          parentId: editingParentId,
          userId: currentUser.uid
        });
        
        // Show success message without extension
        setSuccessMessage(`Created file: ${fileName}`);
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
    
    // Filter nodes with default positions (0,0)
    const defaultPositionNodes = nodesCopy.filter(node => 
      node.position.x === 0 && node.position.y === 0
    );
    
    // Keep track of positioned nodes to avoid overlap
    const positionedNodes = nodesCopy.filter(node => 
      node.position.x !== 0 || node.position.y !== 0
    );
    
    // Arrange only nodes with default positions
    let gridIndex = 0;
    const arrangedNodes = nodesCopy.map(node => {
      // Skip nodes that already have non-default positions
      if (node.position.x !== 0 || node.position.y !== 0) {
        return node;
      }
      
      const row = Math.floor(gridIndex / nodesPerRow);
      const col = gridIndex % nodesPerRow;
      gridIndex++;
      
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
      // Only auto-arrange if at least one node has default (0,0) position
      const hasDefaultPositions = nodes.some(node => 
        node.position.x === 0 && node.position.y === 0
      );
      
      if (hasDefaultPositions) {
        console.log('Auto-arranging nodes with default positions');
        handleAutoArrangeNodes();
      }
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

  // Editor actions
  const ActionsHeader = () => (
    <h3 className="text-lg font-sans font-medium tracking-wide">Actions</h3>
  );

  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Load templates
  const handleLoadTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      const availableTemplates = await BlueprintGenerationService.getTemplates();
      setTemplates(availableTemplates);
      setShowTemplates(true);
      setTemplatesLoading(false);
    } catch (error) {
      console.error("Error loading templates:", error);
      handleError("Failed to load templates");
      setTemplatesLoading(false);
    }
  }, [handleError]);

  // Apply template to canvas
  const handleApplyTemplate = useCallback((template: any) => {
    try {
      if (!template || template.error) {
        handleError("Invalid template selected");
        return;
      }
      
      // Extract nodes and edges from the template
      const { nodes: templateNodes, edges: templateEdges } = template;
      
      if (!templateNodes || !templateEdges) {
        handleError("Template is missing nodes or edges data");
        return;
      }
      
      // Apply to the canvas
      clearBlueprint();
      setNodes(templateNodes);
      setEdges(templateEdges);
      if (template.name) {
        setBlueprintName(template.name);
      }
      if (template.description) {
        setBlueprintDescription(template.description);
      }
      
      setShowTemplates(false);
      
      // Show success message
      setSuccessMessage("Template applied successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Error applying template:", error);
      handleError("Failed to apply template");
    }
  }, [clearBlueprint, setNodes, setEdges, setBlueprintName, setBlueprintDescription, handleError]);

  // Templates modal
  const TemplatesModal = () => {
    if (!showTemplates) return null;
    
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-[#0A0A0A] border border-[#333] rounded-lg p-4 max-w-xl w-full max-h-[80vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-sans font-medium tracking-wide text-white">Blueprint Templates</h3>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-gray-400 hover:text-white"
            >
              <LuX size={20} />
            </button>
          </div>
          
          {templatesLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md text-[#D4AF37]"></span>
            </div>
          ) : templates.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No templates available. Save a blueprint as template to see it here.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {templates.map(template => (
                <button
                  key={template.id}
                  className="text-left border border-[#333] rounded-md p-3 hover:border-[#D4AF37] transition-colors"
                  onClick={() => handleApplyTemplate(template)}
                >
                  <h4 className="text-white font-sans font-medium mb-1">{template.name}</h4>
                  {template.description && (
                    <p className="text-gray-400 text-sm font-sans">{template.description}</p>
                  )}
                  {template.error && (
                    <p className="text-red-500 text-sm font-sans mt-1">{template.error}</p>
                  )}
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <LuFolder className="mr-1" size={12} />
                    <span className="font-mono">{template.nodes?.length || 0} nodes</span>
                    <span className="mx-1">•</span>
                    <LuLayoutGrid className="mr-1" size={12} />
                    <span className="font-mono">{template.edges?.length || 0} connections</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // EditorButtons with additional template button
  const EditorButtons = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full">
      {!isExportMode && (
        <>
          <Button
            icon={<LuSave size={20} />}
            title="Save Blueprint"
            onClick={handleSaveTemplate}
            className="bg-[#1A1A1A] hover:bg-[#222] text-[#D4AF37] border border-[#333] hover:border-[#D4AF37]"
          />
          
          <Button
            icon={<LuDownload size={20} />}
            title="Export Blueprint"
            onClick={handleExport}
            className="bg-[#1A1A1A] hover:bg-[#222] text-white border border-[#333] hover:border-[#D4AF37]"
          />
          
          <Button
            icon={<LuLayoutGrid size={20} />}
            title="Load Template"
            onClick={handleLoadTemplates}
            className="bg-[#1A1A1A] hover:bg-[#222] text-white border border-[#333] hover:border-[#D4AF37]"
          />
          
          <Button
            icon={<LuTrash2 size={20} />}
            title="Clear Canvas"
            onClick={handleClearCanvas}
            className="bg-[#1A1A1A] hover:bg-[#222] text-white border border-[#333] hover:border-[#D4AF37] col-span-2 md:col-span-3"
          />
        </>
      )}
    </div>
  );

  return (
    <div className="w-full h-full relative bg-[#0A0A0A] flex flex-col">
      <div className="absolute top-2 right-2 z-10 flex items-center space-x-2">
        <div className="px-2 py-1 text-xs font-sans font-medium tracking-wider bg-[#1A1A1A] text-[#D4AF37] border border-[#D4AF37]/30 rounded-md">
          BETA
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onSelectionChange={onSelectionChange}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          className="bg-[#050A14]"
        >
          <Controls />
          <Background color="#333" />
          
          {/* Sidebar */}
          <Panel position="top-left" className="bg-[#0A0A0A] border border-[#333] rounded-md p-4 m-2 w-60">
            <div className="space-y-4">
              <ActionsHeader />
              <EditorButtons />
              
              {/* Additional controls would go here */}
            </div>
          </Panel>
          
          {/* NLP Input */}
          <Panel position="bottom-center" className="mb-4 w-full max-w-2xl px-4">
            <NLPInput onGenerate={handleGenerationComplete} onLoading={handleLoading} />
          </Panel>
        </ReactFlow>

        {/* File browser */}
        {!isMobile && (
          <div 
            className={`absolute top-0 bottom-0 ${isPanelOpen ? 'right-0' : '-right-80'} w-80 bg-[#0A0A0A] border-l border-[#333] transition-all duration-300 ease-in-out`}
          >
            <div className="p-4 h-full">
              <FileExplorer
                projectId={projectId}
                onFileSelect={handleFileSelect}
                selectedFileId={currentSelectedFileId}
                onTogglePanel={() => setIsPanelOpen(!isPanelOpen)}
                isPanelOpen={isPanelOpen}
              />
            </div>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="loading loading-spinner loading-lg text-[#D4AF37]"></div>
          <p className="mt-4 text-white font-sans tracking-wide">Processing...</p>
        </div>
      )}
      
      {/* Error message */}
      {errorMessage && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-900/90 text-white px-4 py-3 rounded-md max-w-md w-full backdrop-blur-sm border border-red-700 z-50">
          <h4 className="font-sans font-medium tracking-wide text-sm mb-1">Error</h4>
          <p className="text-sm font-sans tracking-wide">{errorMessage}</p>
        </div>
      )}
      
      {/* Success message */}
      {successMessage && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[#D4AF37]/90 text-black px-4 py-3 rounded-md max-w-md w-full backdrop-blur-sm border border-[#D4AF37] z-50">
          <h4 className="font-sans font-medium tracking-wide text-sm mb-1">Success</h4>
          <p className="text-sm font-sans tracking-wide">{successMessage}</p>
        </div>
      )}
      
      {/* Load templates modal */}
      <TemplatesModal />
    </div>
  );
}; 