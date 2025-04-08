// import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { LLMBlueprintData } from '../types/BlueprintTypes';

// Get the API URL from environment variables or use a relative path
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Service for generating blueprint data by calling our backend API.
 */
export class BlueprintGenerationService {

  

  /**
   * Generate blueprint data by sending query to backend API.
   * @param query The natural language query.
   * @returns The raw JSON string response from the backend (expected to be Gemini output).
   * @throws If the API call fails or returns an error status.
   */
  static async generateFromQuery(query: string): Promise<LLMBlueprintData> {
    console.log("Sending query to backend API...");
    
    // Ensure we have a valid URL
    const backendUrl = API_BASE_URL 
      ? `${API_BASE_URL}/api/generateBlueprint`
      : '/api/generateBlueprint';
      
    console.log(`Using backend URL: ${backendUrl}`);

    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        // Attempt to parse error message from backend if possible
        let errorData = { error: `HTTP error! status: ${response.status}` };
        try {
           errorData = await response.json();
        } catch (e) { /* Ignore if response is not JSON */ }
        console.error("Backend API Error Response:", errorData);
        throw new Error(errorData.error || `Backend API request failed with status ${response.status}`);
      }

      // Get the raw text response
      const rawResponseText = await response.text();
      console.log("Received raw response from Backend API:", rawResponseText);
      
      // Try to parse it as JSON
      try {
        const parsedData = JSON.parse(rawResponseText);
        return parsedData as LLMBlueprintData;
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        // Try to extract JSON if it's wrapped in other content
        const jsonMatch = rawResponseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[0];
          // Parse and return the extracted JSON
          return JSON.parse(extractedJson) as LLMBlueprintData;
        }
        throw new Error('Response is not valid JSON');
      }

    } catch (error) {
      console.error("Error calling backend /api/generateBlueprint:", error);
      const message = error instanceof Error ? error.message : "Unknown fetch error";
      // Add check for connection refused, common if backend isn't running
      if (message.toLowerCase().includes('fetch failed') || message.toLowerCase().includes('connection refused')) {
           throw new Error(`Failed to connect to backend server at ${backendUrl}. Is it running?`);
      }
      throw new Error(`Failed to get generation from backend: ${message}`);
    }
  }

  

  /**
   * Export blueprint data (placeholder - adjust as needed).
   */
  static async exportToUnreal(blueprint: any): Promise<string> {
    // This logic likely remains the same if it just formats existing data
    console.log("Exporting blueprint data:", blueprint);
    // Simulate export process
    return JSON.stringify(blueprint, null, 2);
  }

  /**
   * Save blueprint as a template (placeholder - adjust as needed).
   */
  static async saveAsTemplate(blueprint: any): Promise<void> {
    // This logic likely remains the same
    console.log("Saving blueprint as template:", blueprint);
    // Simulate save process
  }
} 