import { create } from 'zustand';
import { 
  getBlueprintFiles, 
  createBlueprintFile, 
  updateBlueprintFile, 
  deleteBlueprintFile,
  BlueprintFile
} from '../services/firestore';
import { onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { firestore } from '../services/firebase';

// Convert flat structure to hierarchical for UI rendering
const buildFileTree = (files: BlueprintFile[]): BlueprintFile[] => {
  const fileMap = new Map<string, BlueprintFile>();
  const rootFiles: BlueprintFile[] = [];
  
  // First pass: create map of all files
  files.forEach(file => {
    // Ensure files have the proper structure
    const fileWithDefaults = {
      ...file,
      children: file.children || [],
      isOpen: file.isOpen || false
    };
    fileMap.set(file.id!, fileWithDefaults);
  });
  
  // Second pass: build hierarchy
  files.forEach(file => {
    const fileWithId = fileMap.get(file.id!);
    if (!fileWithId) return; // shouldn't happen
    
    if (!file.parentId) {
      // This is a root file/folder
      rootFiles.push(fileWithId);
    } else {
      // This is a child of another folder
      const parent = fileMap.get(file.parentId);
      if (parent && parent.type === 'folder') {
        // Ensure parent has children array
        if (!parent.childrenObjects) {
          parent.childrenObjects = [];
        }
        // Add this file to parent's childrenObjects for UI rendering
        parent.childrenObjects.push(fileWithId);
      } else {
        // Parent not found or not a folder, treat as root
        rootFiles.push(fileWithId);
      }
    }
  });
  
  return rootFiles;
};

interface FileSystemState {
  files: BlueprintFile[];
  hierarchicalFiles: BlueprintFile[];
  isLoading: boolean;
  error: string | null;
  selectedFileId: string | null;
  unsubscribe: (() => void) | null;

  // Actions
  fetchFiles: (projectId: string) => Promise<void>;
  createFile: (file: Omit<BlueprintFile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<BlueprintFile>;
  updateFile: (fileId: string, data: Partial<BlueprintFile>) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  selectFile: (fileId: string | null) => void;
  toggleFolder: (folderId: string) => void;
  setupRealtimeUpdates: (projectId: string) => void;
  cleanupRealtimeUpdates: () => void;
  
  // State management
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useFileSystemStore = create<FileSystemState>((set, get) => ({
  files: [],
  hierarchicalFiles: [],
  isLoading: false,
  error: null,
  selectedFileId: null,
  unsubscribe: null,
  
  // Fetch all files for a project
  fetchFiles: async (projectId: string) => {
    try {
      set({ isLoading: true, error: null });
      const files = await getBlueprintFiles(projectId);
      
      // Store flat structure
      set({ files });
      
      // Build hierarchical structure for UI
      const hierarchicalFiles = buildFileTree(files);
      set({ hierarchicalFiles });
      
    } catch (error: any) {
      console.error('Error fetching files:', error);
      set({ error: error.message || 'Failed to fetch files' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Create a new file or folder
  createFile: async (file: Omit<BlueprintFile, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      set({ isLoading: true, error: null });
      const newFile = await createBlueprintFile(file);
      
      // Update local state (will be overwritten by realtime updates if enabled)
      const currentFiles = get().files;
      set({ 
        files: [...currentFiles, newFile as BlueprintFile],
        hierarchicalFiles: buildFileTree([...currentFiles, newFile as BlueprintFile])
      });
      
      return newFile as BlueprintFile;
    } catch (error: any) {
      console.error('Error creating file:', error);
      set({ error: error.message || 'Failed to create file' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Update an existing file
  updateFile: async (fileId: string, data: Partial<BlueprintFile>) => {
    try {
      set({ isLoading: true, error: null });
      await updateBlueprintFile(fileId, data);
      
      // Update local state (will be overwritten by realtime updates if enabled)
      const currentFiles = get().files;
      const updatedFiles = currentFiles.map(f => 
        f.id === fileId ? { ...f, ...data } : f
      );
      
      set({ 
        files: updatedFiles,
        hierarchicalFiles: buildFileTree(updatedFiles)
      });
    } catch (error: any) {
      console.error('Error updating file:', error);
      set({ error: error.message || 'Failed to update file' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Delete a file or folder
  deleteFile: async (fileId: string) => {
    try {
      set({ isLoading: true, error: null });
      await deleteBlueprintFile(fileId, true);
      
      // Update local state (will be overwritten by realtime updates if enabled)
      const currentFiles = get().files;
      const remainingFiles = currentFiles.filter(f => f.id !== fileId);
      
      set({ 
        files: remainingFiles,
        hierarchicalFiles: buildFileTree(remainingFiles),
        selectedFileId: get().selectedFileId === fileId ? null : get().selectedFileId
      });
    } catch (error: any) {
      console.error('Error deleting file:', error);
      set({ error: error.message || 'Failed to delete file' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Select a file
  selectFile: (fileId: string | null) => {
    set({ selectedFileId: fileId });
  },
  
  // Toggle folder open/closed state
  toggleFolder: (folderId: string) => {
    const currentFiles = get().files;
    const updatedFiles = currentFiles.map(f => 
      f.id === folderId && f.type === 'folder' 
        ? { ...f, isOpen: !f.isOpen } 
        : f
    );
    
    set({ 
      files: updatedFiles,
      hierarchicalFiles: buildFileTree(updatedFiles)
    });
    
    // If we have real-time sync, also update in Firestore
    const folderToUpdate = currentFiles.find(f => f.id === folderId);
    if (folderToUpdate) {
      updateBlueprintFile(folderId, { 
        isOpen: !folderToUpdate.isOpen 
      }).catch(err => {
        console.error("Error updating folder state:", err);
      });
    }
  },
  
  // Setup real-time updates for files in a project
  setupRealtimeUpdates: (projectId: string) => {
    // Clean up any existing subscription first
    get().cleanupRealtimeUpdates();
    
    // Create a new subscription
    const filesQuery = query(
      collection(firestore, 'files'),
      where('projectId', '==', projectId)
    );
    
    const unsubscribe = onSnapshot(filesQuery, (snapshot) => {
      const files: BlueprintFile[] = [];
      
      snapshot.forEach(doc => {
        files.push({
          id: doc.id,
          ...doc.data()
        } as BlueprintFile);
      });
      
      set({ 
        files,
        hierarchicalFiles: buildFileTree(files),
        error: null
      });
    }, (error) => {
      console.error("Error in files real-time updates:", error);
      set({ error: `Real-time updates error: ${error.message}` });
    });
    
    set({ unsubscribe });
  },
  
  // Clean up real-time updates subscription
  cleanupRealtimeUpdates: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null });
    }
  },
  
  // State management helpers
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
})); 