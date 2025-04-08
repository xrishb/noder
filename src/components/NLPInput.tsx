import React, { useState } from 'react';
import { BlueprintGenerationService } from '../services/blueprintGenerationService';
import { useBlueprint } from '../hooks/useBlueprint';
import { LuSend, LuBrain } from 'react-icons/lu';

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
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center bg-[#1A1A1A] border border-[#333] rounded-lg shadow-lg overflow-hidden">
        <div className="absolute left-3 flex items-center justify-center">
          <LuBrain className="w-5 h-5 text-[#4dabf7]" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe what you want to create..."
          className="flex-1 py-2 px-3 pl-10 text-sm font-sans font-medium tracking-wide bg-transparent text-white border-none focus:outline-none placeholder-gray-500 transition-colors"
          disabled={isGenerating}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-[#1A1A1A] text-gray-400 hover:text-[#4dabf7] transition-colors"
          disabled={isGenerating || !query.trim()}
        >
          <LuSend className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}; 