import { create } from 'zustand';
import { 
  createProject, 
  getUserProjects, 
  getProject, 
  updateProject, 
  deleteProject, 
  Project 
} from '../services/firestore';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  
  // Project list actions
  fetchProjects: (userId: string) => Promise<void>;
  
  // Current project actions
  fetchProject: (projectId: string) => Promise<void>;
  createProject: (project: Omit<Project, 'id'>) => Promise<Project>;
  updateProject: (projectId: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  
  // State management
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearCurrentProject: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
  
  // Fetch all projects for a user
  fetchProjects: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      try {
        const projects = await getUserProjects(userId);
        set({ projects: projects as Project[] });
        
        // Store in local storage as backup
        localStorage.setItem(`user_projects_${userId}`, JSON.stringify(projects));
      } catch (error: any) {
        console.error('Error fetching projects:', error);
        
        // If Firebase permission error, try to use local storage as fallback
        if (error.message?.includes('Missing or insufficient permissions')) {
          const localProjects = localStorage.getItem(`user_projects_${userId}`);
          if (localProjects) {
            set({ 
              projects: JSON.parse(localProjects) as Project[],
              error: 'Using cached projects. Firebase permission issue detected.'
            });
          } else {
            // If no local data, use sample projects temporarily
            set({ 
              projects: [
                {
                  id: 'sample1',
                  name: 'Sample Project 1',
                  description: 'A sample project while Firebase permissions are being set up',
                  userId: userId,
                  createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 }
                },
                {
                  id: 'sample2',
                  name: 'Sample Project 2',
                  description: 'Another sample project',
                  userId: userId,
                  createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 }
                }
              ],
              error: 'Firebase permissions issue. Using sample projects until resolved.'
            });
          }
        } else {
          set({ error: error.message || 'Failed to fetch projects' });
        }
      }
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Fetch a specific project
  fetchProject: async (projectId: string) => {
    try {
      set({ isLoading: true, error: null });
      const project = await getProject(projectId);
      set({ currentProject: project as Project });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch project' });
      console.error('Error fetching project:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Create a new project
  createProject: async (project: Omit<Project, 'id'>) => {
    try {
      set({ isLoading: true, error: null });
      
      try {
        const newProject = await createProject(project);
        set(state => ({ 
          projects: [...state.projects, newProject as Project] 
        }));
        
        // Store in local storage as backup
        const userId = project.userId;
        const localProjects = localStorage.getItem(`user_projects_${userId}`);
        let updatedProjects = [];
        if (localProjects) {
          updatedProjects = [...JSON.parse(localProjects), newProject];
        } else {
          updatedProjects = [newProject];
        }
        localStorage.setItem(`user_projects_${userId}`, JSON.stringify(updatedProjects));
        
        return newProject as Project;
      } catch (error: any) {
        console.error('Error creating project:', error);
        
        // If Firebase permission error, store in local storage only
        if (error.message?.includes('Missing or insufficient permissions')) {
          const localProject = {
            ...project,
            id: `local_${Date.now()}`,
            createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
            updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 }
          };
          
          // Add to state
          set(state => ({ 
            projects: [...state.projects, localProject as Project],
            error: 'Project stored locally. Firebase permission issue detected.'
          }));
          
          // Store in local storage
          const userId = project.userId;
          const localProjects = localStorage.getItem(`user_projects_${userId}`);
          let updatedProjects = [];
          if (localProjects) {
            updatedProjects = [...JSON.parse(localProjects), localProject];
          } else {
            updatedProjects = [localProject];
          }
          localStorage.setItem(`user_projects_${userId}`, JSON.stringify(updatedProjects));
          
          return localProject as Project;
        } else {
          set({ error: error.message || 'Failed to create project' });
          throw error;
        }
      }
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Update an existing project
  updateProject: async (projectId: string, data: Partial<Project>) => {
    try {
      set({ isLoading: true, error: null });
      
      // Get state for local storage handling
      const state = get();
      const project = state.projects.find(p => p.id === projectId);
      
      try {
        await updateProject(projectId, data);
      } catch (error: any) {
        console.error('Error updating project in Firebase:', error);
        if (!error.message?.includes('Missing or insufficient permissions')) {
          set({ error: error.message || 'Failed to update project' });
          throw error;
        }
        set({ error: 'Project updated locally only. Firebase permission issue detected.' });
      }
      
      // Update project in projects list
      set(state => ({ 
        projects: state.projects.map(p => 
          p.id === projectId ? { ...p, ...data } : p
        ),
        // Also update currentProject if it's the one being edited
        currentProject: state.currentProject?.id === projectId 
          ? { ...state.currentProject, ...data } 
          : state.currentProject
      }));
      
      // Update local storage
      if (project && project.userId) {
        const localProjects = localStorage.getItem(`user_projects_${project.userId}`);
        if (localProjects) {
          const updatedProjects = JSON.parse(localProjects).map(
            (p: Project) => p.id === projectId ? { ...p, ...data } : p
          );
          localStorage.setItem(`user_projects_${project.userId}`, JSON.stringify(updatedProjects));
        }
      }
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Delete a project
  deleteProject: async (projectId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Get userId before potential deletion
      const state = get();
      const project = state.projects.find(p => p.id === projectId);
      const userId = project?.userId;
      
      try {
        await deleteProject(projectId);
      } catch (error: any) {
        console.error('Error deleting project from Firebase:', error);
        if (!error.message?.includes('Missing or insufficient permissions')) {
          set({ error: error.message || 'Failed to delete project' });
          throw error;
        }
        set({ error: 'Project removed locally only. Firebase permission issue detected.' });
      }
      
      // Remove project from projects list regardless of Firebase result
      set(state => ({ 
        projects: state.projects.filter(p => p.id !== projectId),
        currentProject: state.currentProject?.id === projectId ? null : state.currentProject
      }));
      
      // Update local storage if we have userId
      if (userId) {
        const localProjects = localStorage.getItem(`user_projects_${userId}`);
        if (localProjects) {
          const updatedProjects = JSON.parse(localProjects).filter(
            (p: Project) => p.id !== projectId
          );
          localStorage.setItem(`user_projects_${userId}`, JSON.stringify(updatedProjects));
        }
      }
    } finally {
      set({ isLoading: false });
    }
  },
  
  // State management helpers
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
  clearCurrentProject: () => set({ currentProject: null }),
})); 