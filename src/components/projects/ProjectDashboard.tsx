import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuPlus, LuTrash, LuFolder, LuLoader } from 'react-icons/lu';
import Header from '../shared/Header';
import { useAuth } from '../../contexts/AuthContext';
import { useProjectStore } from '../../store/projectStore';
import { Project } from '../../services/firestore';
import FirebaseErrorAlert from '../shared/FirebaseErrorAlert';

const ProjectDashboard: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const { currentUser } = useAuth();
  const { 
    projects, 
    isLoading, 
    error: projectError, 
    fetchProjects, 
    createProject: createProjectAction,
    deleteProject: deleteProjectAction
  } = useProjectStore();
  
  const navigate = useNavigate();

  // Fetch user's projects on component mount
  useEffect(() => {
    if (currentUser) {
      fetchProjects(currentUser.uid);
    }
  }, [currentUser, fetchProjects]);

  // Handle creating a new project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProjectName.trim() || !currentUser) {
      return;
    }

    try {
      setIsCreating(true);
      
      const newProject = {
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || null,
        userId: currentUser.uid
      };

      await createProjectAction(newProject);
      
      // Reset form
      setNewProjectName('');
      setNewProjectDescription('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error creating project:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle deleting a project
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteProjectAction(projectId);
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#070B14] to-[#0A1428] text-white">
      <Header />
      
      <main className="container mx-auto px-4 pt-32 pb-20">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-white">My Projects</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 px-4 py-2 rounded-md font-medium transition-colors"
          >
            <LuPlus className="mr-2" />
            New Project
          </button>
        </div>
        
        {projectError && projectError.includes('Firebase permission') ? (
          <FirebaseErrorAlert 
            message={projectError} 
            onDismiss={() => useProjectStore.getState().setError(null)} 
          />
        ) : projectError && (
          <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded-md mb-6">
            {projectError}
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <LuLoader className="animate-spin text-blue-500 mr-3" size={24} />
            <span>Loading projects...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-[#0A0F1C]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-10 text-center">
            <div className="flex justify-center">
              <div className="bg-blue-900/20 p-4 rounded-full mb-4">
                <LuFolder className="text-blue-400" size={40} />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">No Projects Yet</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              You haven't created any projects yet. Create your first project to get started with Noder.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 px-5 py-3 rounded-md font-medium transition-colors"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="relative bg-[#0A0F1C]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl overflow-hidden hover:border-gray-700/70 transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/5 group"
              >
                <Link
                  to={`/projects/${project.id}`}
                  className="block p-6"
                >
                  <div className="mb-4 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-900/40 to-indigo-900/40 flex items-center justify-center">
                    <LuFolder className="text-blue-400 group-hover:text-blue-300 transition-colors" size={24} />
                  </div>
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-300 transition-colors">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <p className="text-gray-500 text-xs">
                    {project.createdAt 
                      ? (project.createdAt.seconds 
                          ? new Date(project.createdAt.seconds * 1000).toLocaleDateString() 
                          : new Date(project.createdAt).toLocaleDateString())
                      : 'Recently created'}
                  </p>
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDeleteProject(project.id!);
                  }}
                  className="absolute top-4 right-4 p-2 bg-red-900/20 text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/40"
                  title="Delete project"
                >
                  <LuTrash size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0F1C] border border-gray-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">Create New Project</h3>
              
              <form onSubmit={handleCreateProject}>
                <div className="mb-4">
                  <label htmlFor="project-name" className="block text-sm font-medium text-gray-300 mb-1">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="project-name"
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full bg-[#0F1521] border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
                    placeholder="My Awesome Project"
                    required
                  />
                </div>
                <div className="mb-6">
                  <label htmlFor="project-description" className="block text-sm font-medium text-gray-300 mb-1">
                    Description <span className="text-gray-500">(optional)</span>
                  </label>
                  <textarea
                    id="project-description"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    className="w-full bg-[#0F1521] border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
                    placeholder="Describe your project..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-md border border-gray-700 hover:border-gray-600 text-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newProjectName.trim()}
                    className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                  >
                    {isCreating ? (
                      <>
                        <LuLoader className="animate-spin mr-2" />
                        Creating...
                      </>
                    ) : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDashboard; 