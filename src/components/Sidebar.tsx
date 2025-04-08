import React, { useState } from 'react';
import { LuMenu, LuX } from "react-icons/lu"; // Using react-icons for menu/close icons

interface SidebarProps {
  // Add props later if needed, e.g., for button actions
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  // Define features for the radio menu
  const features = [
    { id: 'feature1', label: 'Export Blueprint' },
    { id: 'feature2', label: 'Save as Template' },
    { id: 'feature3', label: 'Clear Canvas' },
    { id: 'feature4', label: 'Load Template' }, // Example future feature
    // Add more features as needed
  ];

  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const handleFeatureSelect = (featureId: string) => {
    setSelectedFeature(featureId);
    // TODO: Implement actions based on selected feature
    console.log(`Feature selected: ${featureId}`);
    // Close sidebar after selection (optional)
    // setIsOpen(false);
  };

  return (
    <>
      {/* Sidebar Container - Fixed position, transitions */}
      <div 
        className={`fixed top-0 left-0 h-full bg-gray-900 text-white shadow-lg z-30 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} w-64`}
      >
        {/* Sidebar Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Menu</h2>
          <button 
            onClick={toggleSidebar} 
            className="text-gray-400 hover:text-white"
            aria-label="Close menu"
          >
            <LuX size={20} />
          </button>
        </div>

        {/* Radio Menu Options */}
        <nav className="p-4">
          <ul className="space-y-2">
            {features.map((feature) => (
              <li key={feature.id}>
                <label className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-800">
                  <input 
                    type="radio" 
                    name="sidebar-feature" 
                    value={feature.id} 
                    checked={selectedFeature === feature.id}
                    onChange={() => handleFeatureSelect(feature.id)}
                    className="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{feature.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </nav>

        {/* Add other sections if needed */}
      </div>

      {/* Overlay for clicking outside to close (optional) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20" 
          onClick={toggleSidebar}
        />
      )}

      {/* Toggle Button - Fixed position */}
      <button 
        onClick={toggleSidebar} 
        className={`fixed top-4 left-4 z-40 p-2 bg-gray-800 text-white rounded-md shadow-lg hover:bg-gray-700 transition-opacity duration-300 ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-label="Open menu"
      >
        <LuMenu size={20} />
      </button>
    </>
  );
}; 