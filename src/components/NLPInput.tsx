import React, { useState } from 'react';
import { useBlueprint } from '../hooks/useBlueprint';
import { LuSend, LuBrain } from 'react-icons/lu';

interface NLPInputProps {
  onGenerate?: (blueprintData: any) => void;
}

export const NLPInput: React.FC<NLPInputProps> = ({ 
  onGenerate
}) => {
  const [query, setQuery] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const { loadBlueprint, isLoading } = useBlueprint();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isGenerating) return;
    
    try {
      setIsGenerating(true);
      
      // Call the loadBlueprint hook function with the user query
      await loadBlueprint(query);
      
      // Call onGenerate callback if provided
      if (onGenerate) {
        onGenerate(query);
      }
      
      // Clear input after successful generation
      setQuery('');
    } catch (error) {
      console.error('Blueprint generation failed:', error);
    } finally {
      setIsGenerating(false);
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