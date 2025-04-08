import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  DocumentReference,
  DocumentData
} from 'firebase/firestore';
import { firestore } from './firebase';

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  PROJECTS: 'projects',
  BLUEPRINTS: 'blueprints',
  FILES: 'files'
};

// Interface for a project
export interface Project {
  id?: string;
  name: string;
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  userId: string;
}

// Interface for a blueprint
export interface Blueprint {
  id?: string;
  name: string;
  description?: string;
  nodes: any[];
  edges: any[];
  projectId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  userId: string;
}

// Interface for a file system item (file or folder)
export interface FileSystemItem {
  id?: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  projectId: string;
  parentId?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  userId: string;
}

// User methods
export const createUserProfile = async (userId: string, data: any) => {
  try {
    const userRef = doc(firestore, COLLECTIONS.USERS, userId);
    await setDoc(userRef, {
      ...data,
      createdAt: serverTimestamp()
    });
    return userRef;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(firestore, COLLECTIONS.USERS, userId));
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Project methods
export const createProject = async (project: Project) => {
  try {
    const projectData = {
      ...project,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const projectRef = await addDoc(collection(firestore, COLLECTIONS.PROJECTS), projectData);
    return { id: projectRef.id, ...projectData };
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};

export const getUserProjects = async (userId: string) => {
  try {
    const projectsQuery = query(
      collection(firestore, COLLECTIONS.PROJECTS),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(projectsQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting user projects:', error);
    throw error;
  }
};

export const getProject = async (projectId: string) => {
  try {
    const projectDoc = await getDoc(doc(firestore, COLLECTIONS.PROJECTS, projectId));
    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }
    return { id: projectDoc.id, ...projectDoc.data() };
  } catch (error) {
    console.error('Error getting project:', error);
    throw error;
  }
};

export const updateProject = async (projectId: string, data: Partial<Project>) => {
  try {
    const projectRef = doc(firestore, COLLECTIONS.PROJECTS, projectId);
    await updateDoc(projectRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return projectRef;
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
};

export const deleteProject = async (projectId: string) => {
  try {
    await deleteDoc(doc(firestore, COLLECTIONS.PROJECTS, projectId));
    // TODO: Delete associated blueprints and files
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

// Blueprint methods
export const createBlueprint = async (blueprint: Blueprint) => {
  try {
    const blueprintData = {
      ...blueprint,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const blueprintRef = await addDoc(collection(firestore, COLLECTIONS.BLUEPRINTS), blueprintData);
    return { id: blueprintRef.id, ...blueprintData };
  } catch (error) {
    console.error('Error creating blueprint:', error);
    throw error;
  }
};

export const getProjectBlueprints = async (projectId: string) => {
  try {
    const blueprintsQuery = query(
      collection(firestore, COLLECTIONS.BLUEPRINTS),
      where('projectId', '==', projectId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(blueprintsQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting project blueprints:', error);
    throw error;
  }
};

export const getBlueprint = async (blueprintId: string) => {
  try {
    const blueprintDoc = await getDoc(doc(firestore, COLLECTIONS.BLUEPRINTS, blueprintId));
    if (!blueprintDoc.exists()) {
      throw new Error('Blueprint not found');
    }
    return { id: blueprintDoc.id, ...blueprintDoc.data() };
  } catch (error) {
    console.error('Error getting blueprint:', error);
    throw error;
  }
};

export const updateBlueprint = async (blueprintId: string, data: Partial<Blueprint>) => {
  try {
    const blueprintRef = doc(firestore, COLLECTIONS.BLUEPRINTS, blueprintId);
    await updateDoc(blueprintRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return blueprintRef;
  } catch (error) {
    console.error('Error updating blueprint:', error);
    throw error;
  }
};

export const deleteBlueprint = async (blueprintId: string) => {
  try {
    await deleteDoc(doc(firestore, COLLECTIONS.BLUEPRINTS, blueprintId));
  } catch (error) {
    console.error('Error deleting blueprint:', error);
    throw error;
  }
};

// File system methods
export const createFile = async (file: FileSystemItem) => {
  try {
    const fileData = {
      ...file,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const fileRef = await addDoc(collection(firestore, COLLECTIONS.FILES), fileData);
    return { id: fileRef.id, ...fileData };
  } catch (error) {
    console.error('Error creating file:', error);
    throw error;
  }
};

export const getProjectFiles = async (projectId: string) => {
  try {
    const filesQuery = query(
      collection(firestore, COLLECTIONS.FILES),
      where('projectId', '==', projectId)
    );
    
    const querySnapshot = await getDocs(filesQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting project files:', error);
    throw error;
  }
};

export const getFile = async (fileId: string) => {
  try {
    const fileDoc = await getDoc(doc(firestore, COLLECTIONS.FILES, fileId));
    if (!fileDoc.exists()) {
      throw new Error('File not found');
    }
    return { id: fileDoc.id, ...fileDoc.data() };
  } catch (error) {
    console.error('Error getting file:', error);
    throw error;
  }
};

export const updateFile = async (fileId: string, data: Partial<FileSystemItem>) => {
  try {
    const fileRef = doc(firestore, COLLECTIONS.FILES, fileId);
    await updateDoc(fileRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return fileRef;
  } catch (error) {
    console.error('Error updating file:', error);
    throw error;
  }
};

export const deleteFile = async (fileId: string) => {
  try {
    await deleteDoc(doc(firestore, COLLECTIONS.FILES, fileId));
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// Blueprint file specific methods
export interface BlueprintFile {
  id?: string;
  name: string;
  content: string;
  type: 'file' | 'folder';
  projectId: string;
  parentId?: string | null;
  children?: string[]; // Array of file IDs for folders
  isOpen?: boolean;
  path?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  userId: string;
}

export const createBlueprintFile = async (file: Omit<BlueprintFile, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const fileData = {
      ...file,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const fileRef = await addDoc(collection(firestore, COLLECTIONS.FILES), fileData);
    
    // If this is a child of a folder, update the parent folder
    if (file.parentId) {
      const parentRef = doc(firestore, COLLECTIONS.FILES, file.parentId);
      const parentDoc = await getDoc(parentRef);
      
      if (parentDoc.exists() && parentDoc.data().type === 'folder') {
        const parentData = parentDoc.data();
        const children = parentData.children || [];
        
        await updateDoc(parentRef, {
          children: [...children, fileRef.id],
          updatedAt: serverTimestamp()
        });
      }
    }
    
    return { id: fileRef.id, ...fileData };
  } catch (error) {
    console.error('Error creating blueprint file:', error);
    throw error;
  }
};

export const getBlueprintFiles = async (projectId: string) => {
  try {
    const filesQuery = query(
      collection(firestore, COLLECTIONS.FILES),
      where('projectId', '==', projectId)
    );
    
    const querySnapshot = await getDocs(filesQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BlueprintFile[];
  } catch (error) {
    console.error('Error getting blueprint files:', error);
    throw error;
  }
};

export const updateBlueprintFile = async (fileId: string, data: Partial<BlueprintFile>) => {
  try {
    const fileRef = doc(firestore, COLLECTIONS.FILES, fileId);
    
    // Don't allow updating projectId or userId
    const { projectId, userId, ...updateData } = data;
    
    await updateDoc(fileRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
    return fileRef;
  } catch (error) {
    console.error('Error updating blueprint file:', error);
    throw error;
  }
};

export const deleteBlueprintFile = async (fileId: string, recursive = true) => {
  try {
    const fileRef = doc(firestore, COLLECTIONS.FILES, fileId);
    const fileDoc = await getDoc(fileRef);
    
    if (!fileDoc.exists()) {
      throw new Error('File not found');
    }
    
    const fileData = fileDoc.data() as BlueprintFile;
    
    // If it's a folder and recursive is true, delete all children
    if (fileData.type === 'folder' && recursive && fileData.children && fileData.children.length > 0) {
      // Delete all children first
      for (const childId of fileData.children) {
        await deleteBlueprintFile(childId, recursive);
      }
    }
    
    // If this is a child of a folder, update the parent
    if (fileData.parentId) {
      const parentRef = doc(firestore, COLLECTIONS.FILES, fileData.parentId);
      const parentDoc = await getDoc(parentRef);
      
      if (parentDoc.exists()) {
        const parentData = parentDoc.data() as BlueprintFile;
        if (parentData.children && parentData.children.includes(fileId)) {
          await updateDoc(parentRef, {
            children: parentData.children.filter(id => id !== fileId),
            updatedAt: serverTimestamp()
          });
        }
      }
    }
    
    // Finally delete the file itself
    await deleteDoc(fileRef);
    
    return true;
  } catch (error) {
    console.error('Error deleting blueprint file:', error);
    throw error;
  }
}; 