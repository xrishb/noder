import React, { useState } from 'react';
import Header from './shared/Header';
import { LuSquare, LuLayers, LuBrainCircuit, LuPuzzle, LuRocket, LuLightbulb, LuCheck, LuArrowRight, LuCode, LuBox, LuSparkles, LuUsers, LuGlobe, LuGithub } from 'react-icons/lu';

// Interface for roadmap phases
interface RoadmapPhase {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  items: RoadmapItem[];
}

// Interface for roadmap items
interface RoadmapItem {
  text: string;
  completed: boolean;
  subItems?: RoadmapItem[];
}

const RoadmapPage: React.FC = () => {
  // Track which phases are expanded
  const [expandedPhases, setExpandedPhases] = useState<string[]>(['phase-1']);

  // Toggle phase expansion
  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => 
      prev.includes(phaseId) 
        ? prev.filter(id => id !== phaseId) 
        : [...prev, phaseId]
    );
  };

  // Roadmap data
  const roadmapPhases: RoadmapPhase[] = [
    {
      id: 'phase0',
      title: 'Phase 0: Landing Page & Authentication',
      description: 'Building the initial user interface and authentication system',
      icon: <LuLayers className="w-10 h-10 text-secondary-400" />,
      items: [
        {
          text: 'Landing Page',
          completed: true,
          subItems: [
            { text: 'Create a clean, visually appealing home page', completed: true },
            { text: 'Include key features/benefits overview', completed: true },
            { text: 'Implement navigation to project dashboard', completed: true },
            { text: 'Responsive design for all devices', completed: true }
          ]
        },
        {
          text: 'Authentication',
          completed: false,
          subItems: [
            { text: 'User signup with email validation', completed: false },
            { text: 'Secure login functionality', completed: false },
            { text: 'Password reset flow', completed: false },
            { text: 'Authentication state management', completed: false },
            { text: 'Protected routes for authenticated users', completed: false }
          ]
        }
      ]
    },
    {
      id: 'phase1',
      title: 'Phase 1: Project-Based Structure & Basic Editing',
      description: 'Implementing project management and blueprint file handling',
      icon: <LuBrainCircuit className="w-10 h-10 text-primary-400" />,
      items: [
        {
          text: 'Project Management UI',
          completed: true,
          subItems: [
            { text: 'Landing page displaying a list of projects', completed: true },
            { text: 'Ability to create new projects (with names)', completed: true },
            { text: 'Ability to delete projects', completed: true },
            { text: 'Ability to open a project', completed: true }
          ]
        },
        {
          text: 'Blueprint File Management',
          completed: true,
          subItems: [
            { text: 'View listing blueprint files within the selected project', completed: true },
            { text: 'Save generated blueprints as named files within the current project', completed: true },
            { text: 'Ability to open a specific blueprint file in the editor', completed: true },
            { text: 'Ability to delete blueprint files', completed: true }
          ]
        },
        {
          text: 'Data Persistence',
          completed: false,
          subItems: [
            { text: 'Use Browser Local Storage to save/load project and blueprint data', completed: false }
          ]
        },
        {
          text: 'Routing',
          completed: true,
          subItems: [
            { text: 'Implement client-side routing for navigation between dashboard and editor', completed: true }
          ]
        },
        {
          text: 'Integrate Generation',
          completed: true,
          subItems: [
            { text: 'Modify generation flow to save the result into the currently active project/blueprint file', completed: true }
          ]
        }
      ]
    },
    {
      id: 'phase2',
      title: 'Phase 2: Editor Enhancements',
      description: 'Improving the visual editor experience and adding advanced controls',
      icon: <LuPuzzle className="w-10 h-10 text-accent-400" />,
      items: [
        {
          text: 'Improved Visualization',
          completed: false,
          subItems: [
            { text: 'More accurate UE node/pin styling (colors, shapes)', completed: false },
            { text: 'Better edge routing/styles', completed: false }
          ]
        },
        {
          text: 'Manual Editing',
          completed: true,
          subItems: [
            { text: 'Allow moving nodes after generation', completed: true },
            { text: 'Allow deleting selected nodes/edges', completed: true },
            { text: 'Allow adding nodes/connections manually', completed: false }
          ]
        },
        {
          text: 'UI Controls',
          completed: true,
          subItems: [
            { text: 'Zoom/Pan controls', completed: true },
            { text: 'Fit-to-view button', completed: true }
          ]
        }
      ]
    },
    {
      id: 'phase3',
      title: 'Phase 3: Output & Integration',
      description: 'Finalizing output formats and integrating with external systems',
      icon: <LuRocket className="w-10 h-10 text-violet-400" />,
      items: [
        {
          text: 'Unreal Engine Export',
          completed: false,
          subItems: [
            { text: 'Generate `.copy` text format suitable for pasting into the UE editor', completed: false },
            { text: 'Add an "Export for Unreal" button', completed: false }
          ]
        },
        {
          text: 'Output Quality',
          completed: false,
          subItems: [
            { text: 'Advanced prompt engineering for better JSON accuracy', completed: false },
            { text: 'Implement JSON schema validation', completed: false },
            { text: 'Add retry mechanism for LLM errors/invalid JSON', completed: false }
          ]
        }
      ]
    },
    {
      id: 'future',
      title: 'Future Ideas & Backlog',
      description: 'Long-term vision and advanced feature concepts',
      icon: <LuLightbulb className="w-10 h-10 text-yellow-400" />,
      items: [
        { text: 'Expanding user profiles with preferences', completed: false },
        { text: 'Sharing Projects/Blueprints with other users', completed: false },
        { text: 'Support for different LLMs', completed: false },
        { text: 'More advanced node types/features (Macros, Functions within Blueprints)', completed: false },
        { text: 'Real-time Collaboration', completed: false },
        { text: 'Analytics on usage and blueprint complexity', completed: false },
        { text: 'Community templates and examples', completed: false }
      ]
    }
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#070B14] to-[#0A1428] text-white">
      <Header />
      
      {/* Main Content */}
      <div className="pt-28 pb-20 px-6 max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="relative mb-16">
          {/* Glow effect */}
          <div className="absolute -inset-1 top-20 bg-gradient-to-r from-secondary-700/20 via-primary-600/20 to-accent-600/20 rounded-lg blur-xl opacity-70"></div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-secondary-300 via-primary-300 to-accent-400 bg-clip-text text-transparent">
            Noder Project Roadmap
          </h1>
          <p className="text-lg text-center text-gray-300 max-w-3xl mx-auto">
            Our development journey and the exciting features we're building for you.
            Track our progress and see what's coming next in our visual blueprint generation tool.
          </p>
        </div>
        
        {/* Core Goal Section */}
        <div className="relative mb-16 bg-[#0A0F1C]/50 backdrop-blur-md border border-gray-800/40 p-8 rounded-xl">
          <h2 className="text-2xl font-bold text-center mb-6 text-primary-300">Core Goal</h2>
          <p className="text-lg text-center text-gray-300 max-w-3xl mx-auto">
            To provide a tool that allows users to generate Unreal Engine Blueprints from natural language queries
            and manage them within a project structure.
          </p>
        </div>
        
        {/* Phases Timeline */}
        <div className="space-y-8">
          {roadmapPhases.map((phase) => (
            <div 
              key={phase.id}
              className="relative transition-all duration-300 bg-[#0A0F1C]/40 backdrop-blur-sm border border-gray-800/30 rounded-xl overflow-hidden hover:border-gray-700/50 hover:shadow-md hover:shadow-accent-900/20"
            >
              {/* Phase Header */}
              <div 
                className="flex items-center cursor-pointer p-6 group"
                onClick={() => togglePhase(phase.id)}
              >
                <div className="mr-6 p-3 rounded-full bg-[#0A1428]/60 group-hover:bg-[#0A1428]/90 transition-all border border-gray-800/30">
                  {phase.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-100 group-hover:text-white transition-colors">
                    {phase.title}
                  </h3>
                  <p className="text-gray-400 group-hover:text-gray-300 transition-colors">
                    {phase.description}
                  </p>
                </div>
                <div className="ml-4 transform transition-transform duration-300">
                  <svg 
                    className={`w-6 h-6 text-gray-400 ${expandedPhases.includes(phase.id) ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {/* Phase Content */}
              {expandedPhases.includes(phase.id) && (
                <div className="px-6 pb-6 border-t border-gray-800/50 pt-4 space-y-4">
                  {phase.items.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-start">
                        {item.completed ? (
                          <LuCheck className="w-5 h-5 text-accent-400 mr-3 mt-0.5" />
                        ) : (
                          <LuSquare className="w-5 h-5 text-gray-500 mr-3 mt-0.5" />
                        )}
                        <span className={`font-medium ${item.completed ? 'text-white' : 'text-gray-300'}`}>
                          {item.text}
                        </span>
                      </div>
                      
                      {/* Sub-items */}
                      {item.subItems && (
                        <div className="ml-8 pl-4 border-l border-gray-800/60 space-y-2 mt-2">
                          {item.subItems.map((subItem, subIndex) => (
                            <div key={subIndex} className="flex items-start">
                              {subItem.completed ? (
                                <LuCheck className="w-4 h-4 text-accent-400 mr-3 mt-0.5" />
                              ) : (
                                <LuSquare className="w-4 h-4 text-gray-500 mr-3 mt-0.5" />
                              )}
                              <span className={`text-sm ${subItem.completed ? 'text-gray-300' : 'text-gray-400'}`}>
                                {subItem.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Contribute Section */}
        <div className="mt-16 text-center">
          <div className="relative inline-block">
            <div className="absolute -inset-1 bg-gradient-to-r from-secondary-700/30 to-accent-600/30 rounded-full blur-md opacity-70"></div>
            <a 
              href="https://github.com/your-repo/noder" 
              target="_blank" 
              rel="noopener noreferrer"
              className="relative px-8 py-3 bg-[#0A0F1C] border border-secondary-700/40 rounded-full text-sm font-medium text-white hover:text-white/90 transition-all duration-300 inline-block"
            >
              Contribute on GitHub
            </a>
          </div>
          <p className="mt-4 text-gray-400 text-sm">
            Have ideas? We'd love to hear from you!
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoadmapPage; 