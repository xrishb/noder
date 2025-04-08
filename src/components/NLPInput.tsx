import React, { useState } from 'react';
import { BlueprintGenerationService } from '../services/blueprintGenerationService';
import { useBlueprint } from '../hooks/useBlueprint';
import { LuSend, LuBrainCircuit } from 'react-icons/lu';

interface NLPInputProps {
  onLoading: (isLoading: boolean) => void;
  onError: (error: string | null) => void; // Allow null for clearing errors
  onGenerationComplete?: (blueprintData: any) => void; // Optional callback for when generation completes
}

export const NLPInput: React.FC<NLPInputProps> = ({ 
  onLoading, 
  onError,
  onGenerationComplete 
}) => {
  const [query, setQuery] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [placeholder, setPlaceholder] = useState<string>('Describe the blueprint to generate...');
  const { loadBlueprint } = useBlueprint();

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isGenerating) return;
    
    try {
      setIsGenerating(true);
      onLoading(true);
      onError(null); // Clear previous errors
      
      const generatedBlueprint = await BlueprintGenerationService.generateFromQuery(query);
      loadBlueprint(generatedBlueprint);
      
      // Call the onGenerationComplete callback if provided
      if (onGenerationComplete) {
        onGenerationComplete(generatedBlueprint);
      }
      
      // Don't update placeholder, keep it simple
      setQuery('');
    } catch (error) {
      console.error('Blueprint generation failed:', error);
      onError('Failed to generate: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsGenerating(false);
      onLoading(false);
    }
  };

  return (
    <div className="group bg-gradient-to-b from-gray-800/90 to-gray-900/95 backdrop-blur-md rounded-xl border border-gray-700/40 shadow-lg p-3 transition-all duration-300 hover:shadow-xl focus-within:border-blue-500/40 focus-within:shadow-blue-500/10">
      <form onSubmit={handleSubmit} className="flex items-center">
        <div className="flex items-center justify-center w-8 h-8 mr-2 bg-gray-800 rounded-full">
          <LuBrainCircuit size={18} className="text-blue-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder={placeholder}
          disabled={isGenerating}
          className="flex-1 py-2 px-3 text-sm bg-transparent text-white border-none focus:outline-none placeholder-gray-500 transition-colors"
        />
        <button 
          type="submit" 
          disabled={isGenerating || !query.trim()}
          className="p-2 ml-2 bg-gradient-to-r from-blue-600 to-cyan-700 text-white rounded-lg cursor-pointer transition-all duration-200 hover:brightness-110 active:brightness-90 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg group-focus-within:shadow-blue-500/20"
          aria-label="Generate Blueprint"
        >
          {isGenerating ? (
            <div className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
          ) : (
            <LuSend className="w-5 h-5 transition-colors group-hover:text-blue-200"/>
          )}
        </button>
      </form>
    </div>
  );
}; 