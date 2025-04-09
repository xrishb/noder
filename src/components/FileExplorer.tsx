import React, { useState, useEffect } from 'react';
import { 
  LuFolder, 
  LuFolderPlus, 
  LuFilePlus, 
  LuFile, 
  LuChevronRight, 
  LuChevronDown, 
  LuSearch, 
  LuTrash, 
  LuPencil, 
  LuFolderArchive,
  LuArrowLeft,
  LuMenu,
  LuChevronLeft,
  LuChevronUp,
  LuPlus,
  LuX,
  LuCheck,
  LuClock,
  LuTag,
  LuStar,
  LuFilter
} from 'react-icons/lu';
import { useFileSystemStore } from '../store/fileSystemStore';
import { useNavigate } from 'react-router-dom';

interface FileExplorerProps {
  projectId: string;
  onFileSelect: (fileId: string) => void;
  selectedFileId: string | null;
  onTogglePanel: (isOpen: boolean) => void;
  isPanelOpen: boolean;
}

interface ContextMenu {
  isOpen: boolean;
  x: number;
  y: number;
  type: 'file' | 'folder' | null;
  itemId: string | null;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  projectId,
  onFileSelect,
  selectedFileId,
  onTogglePanel,
  isPanelOpen
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    isOpen: false,
    x: 0,
    y: 0,
    type: null,
    itemId: null,
  });
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'modified'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<'all' | 'files' | 'folders'>('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // Access file system store
  const {
    hierarchicalFiles,
    isLoading: isLoadingFiles,
    error: fileSystemError,
    fetchFiles,
    createFile,
    deleteFile,
    updateFile,
    selectFile,
    toggleFolder,
    setupRealtimeUpdates,
    cleanupRealtimeUpdates
  } = useFileSystemStore();
  
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
  
  // Filter files based on search query and filter type
  const filteredFiles = React.useMemo(() => {
    if (!hierarchicalFiles) return [];
    
    const searchLower = searchQuery.toLowerCase();
    const filterItems = (items: any[]): any[] => {
      return items.filter(item => {
        // Apply type filter
        if (filterType === 'files' && item.type !== 'file') return false;
        if (filterType === 'folders' && item.type !== 'folder') return false;
        
        // Apply search filter
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
  }, [hierarchicalFiles, searchQuery, filterType]);
  
  // Sort files based on selected criteria
  const sortedFiles = React.useMemo(() => {
    if (!filteredFiles) return [];
    
    const sortItems = (items: any[]): any[] => {
      return [...items].sort((a, b) => {
        if (sortBy === 'name') {
          return sortOrder === 'asc' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        } else if (sortBy === 'modified') {
          const dateA = a.updatedAt || a.createdAt || new Date(0);
          const dateB = b.updatedAt || b.createdAt || new Date(0);
          return sortOrder === 'asc' 
            ? dateA.getTime() - dateB.getTime()
            : dateB.getTime() - dateA.getTime();
        } else if (sortBy === 'type') {
          // Folders first, then files
          if (a.type !== b.type) {
            return sortOrder === 'asc'
              ? (a.type === 'folder' ? -1 : 1)
              : (a.type === 'folder' ? 1 : -1);
          }
          return sortOrder === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }
        return 0;
      });
    };
    
    return sortItems(filteredFiles);
  }, [filteredFiles, sortBy, sortOrder]);
  
  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, type: 'file' | 'folder', itemId: string) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      type,
      itemId,
    });
  };
  
  // Close context menu
  const closeContextMenu = () => {
    setContextMenu({
      isOpen: false,
      x: 0,
      y: 0,
      type: null,
      itemId: null,
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
      if (contextMenu.isOpen) {
        closeContextMenu();
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.isOpen]);
  
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
    if (!newItemName.trim()) return;
    
    try {
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
          userId: 'currentUser.uid' // This should be replaced with actual user ID
        });
      } else if (isCreatingFolder) {
        // Create a new folder
        await createFile({
          name: newItemName.trim(),
          content: '',
          type: 'folder',
          projectId,
          parentId: editingParentId,
          userId: 'currentUser.uid', // This should be replaced with actual user ID
          children: []
        });
      }
    } catch (error) {
      console.error('Error creating item:', error);
    } finally {
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
        await deleteFile(itemId);
        
        if (selectedFileId === itemId) {
          onFileSelect('');
        }
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };
  
  // Toggle folder open/closed
  const handleToggleFolder = (folderId: string) => {
    toggleFolder(folderId);
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };
  
  // Handle file selection
  const handleFileSelect = (fileId: string) => {
    onFileSelect(fileId);
  };
  
  // Recursive function to render the file system
  const renderFileSystem = (items: any[]) => {
    return items.map(item => (
      <div key={item.id} className="relative">
        <div
          className={`flex items-center px-2 py-1.5 cursor-pointer hover:bg-[#1A1A1A] rounded-md ${
            selectedFileId === item.id ? 'bg-[#1A1A1A] border-l-2 border-[#4dabf7]' : ''
          }`}
          onClick={() => item.type === 'folder' ? handleToggleFolder(item.id) : handleFileSelect(item.id)}
          onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}
        >
          {item.type === 'folder' ? (
            <>
              {item.childrenObjects && item.childrenObjects.length > 0 ? (
                expandedFolders.has(item.id) ? (
                  <LuChevronDown className="w-4 h-4 mr-1 text-[#4dabf7]" />
                ) : (
                  <LuChevronRight className="w-4 h-4 mr-1 text-[#4dabf7]" />
                )
              ) : (
                <div className="w-4 mr-1" />
              )}
              <LuFolder className="w-4 h-4 mr-2 text-[#4dabf7]" />
            </>
          ) : (
            <>
              <div className="w-4 mr-1" />
              <LuFile className={`mr-2 ${selectedFileId === item.id ? 'text-[#4dabf7]' : 'text-[#4dabf7]/60'}`} size={16} />
            </>
          )}
          <span 
            className="flex-1 truncate cursor-pointer hover:text-white font-sans tracking-wide"
            onClick={() => onFileSelect(item.id)}
          >
            {item.name.replace(/\.ueblueprint$/, '')}
          </span>
          <button
            className="ml-auto opacity-0 hover:opacity-100 transition-opacity text-gray-400 hover:text-[#4dabf7]"
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e, item.type, item.id);
            }}
          >
            •••
          </button>
        </div>
        {item.type === 'folder' && expandedFolders.has(item.id) && item.childrenObjects && (
          <div className="ml-4">
            {renderFileSystem(item.childrenObjects)}
          </div>
        )}
      </div>
    ));
  };
  
  // Render grid view of files
  const renderGridView = (items: any[]) => {
    return (
      <div className="grid grid-cols-2 gap-3 p-2">
        {items.map(item => (
          <div 
            key={item.id}
            className={`p-3 rounded-lg transition-all duration-200 ${
              selectedFileId === item.id 
                ? 'bg-[#1A1A1A] text-white border border-[#D4AF37] shadow-sm' 
                : 'text-gray-300 hover:bg-[#1A1A1A] border border-[#333]'
            }`}
            onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}
          >
            <div className="flex flex-col items-center">
              {item.type === 'folder' ? (
                <button 
                  onClick={() => handleToggleFolder(item.id)}
                  className="p-2 rounded-full bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#D4AF37] hover:text-white transition-all duration-300 mb-2"
                >
                  <LuFolder size={24} />
                </button>
              ) : (
                <div 
                  onClick={() => handleFileSelect(item.id)}
                  className="p-2 rounded-full bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#D4AF37] hover:text-white transition-all duration-300 mb-2 cursor-pointer"
                >
                  <LuFile size={24} />
                </div>
              )}
              <span className="text-xs text-center truncate w-full">{item.name}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="h-full flex flex-col bg-[#0A0A0A] border-r border-[#222]">
      <div className="p-4 border-b border-[#222] bg-[#151515]">
        <h2 className="text-base font-sans font-bold tracking-wide text-white">File Explorer</h2>
        <span className="text-sm font-sans font-medium tracking-wide text-gray-400">Project Files</span>
      </div>
      
      <div className="p-3 border-b border-[#222]">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <LuSearch className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-8 pr-2 py-1.5 text-sm font-sans font-medium tracking-wide border border-[#333] rounded-md bg-[#1A1A1A] text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#4dabf7] focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {renderFileSystem(sortedFiles)}
        </div>
      </div>

      <div className="p-3 border-t border-[#222] bg-[#151515]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-sans font-medium tracking-wide text-gray-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'type' | 'modified')}
            className="text-xs font-sans font-medium tracking-wide bg-[#1A1A1A] border border-[#333] rounded px-2 py-1 text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#4dabf7]"
          >
            <option value="name">Name</option>
            <option value="type">Type</option>
            <option value="modified">Date</option>
          </select>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => handleCreateFileUI(null)}
            className="flex-1 px-3 py-1.5 text-xs font-sans font-medium tracking-wide bg-[#1A1A1A] text-gray-300 border border-[#333] rounded hover:bg-[#4dabf7] hover:text-white transition-colors"
          >
            New File
          </button>
          <button
            onClick={() => handleCreateFolderUI(null)}
            className="flex-1 px-3 py-1.5 text-xs font-sans font-medium tracking-wide bg-[#1A1A1A] text-gray-300 border border-[#333] rounded hover:bg-[#4dabf7] hover:text-white transition-colors"
          >
            New Folder
          </button>
        </div>
      </div>

      {contextMenu.isOpen && (
        <div 
          className="fixed z-50 bg-[#1A1A1A] border border-[#333] rounded-md shadow-lg py-1 min-w-[160px]"
          style={{ 
            top: contextMenu.y, 
            left: contextMenu.x,
            maxHeight: 'calc(100vh - 40px)',
            overflowY: 'auto'
          }}
        >
          {contextMenu.type === 'folder' && (
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
    </div>
  );
};