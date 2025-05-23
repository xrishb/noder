// import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { LLMBlueprintData } from '../types/BlueprintTypes';

// Get the API URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  console.warn('VITE_API_URL is not set in environment variables');
}

/**
 * Service for generating blueprint data by calling our backend API.
 */
export class BlueprintGenerationService {
  /**
   * Generate blueprint data by sending query to backend API.
   * @param query The natural language query.
   * @returns The raw JSON string response from the backend.
   * @throws If the API call fails or returns an error status.
   */
  static async generateFromQuery(query: string): Promise<string> {
    if (!query.trim()) {
      throw new Error('Query cannot be empty');
    }

    console.log("[BlueprintGenerationService] Sending query to API:", query);
    
    // Use the API URL from environment variables
    const backendUrl = `${API_BASE_URL}/api/generateBlueprint`;
    console.log(`[BlueprintGenerationService] Using backend URL: ${backendUrl}`);

    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          query,
          format: 'json' // Explicitly request JSON response
        }),
      });

      // Get the response text first for logging
      const responseText = await response.text();
      console.log("[BlueprintGenerationService] Raw API Response:", responseText);

      if (!response.ok) {
        console.error("[BlueprintGenerationService] API Error Response:", responseText);
        try {
          // Try to extract detailed error information if available
          const errorJson = JSON.parse(responseText);
          if (errorJson.error) {
            console.error("[BlueprintGenerationService] Error details:", errorJson);
            
            // Check if we have more detailed diagnostic info
            if (errorJson.raw_error) {
              console.error("[BlueprintGenerationService] JSON Parse Error:", errorJson.raw_error);
            }
            
            if (errorJson.response_preview) {
              console.error("[BlueprintGenerationService] Response Preview:", errorJson.response_preview);
            }
            
            throw new Error(`API request failed with status ${response.status}: ${errorJson.error}`);
          }
        } catch (parseError) {
          // If we can't parse the error as JSON, just use the raw text
          console.error("[BlueprintGenerationService] Failed to parse error response as JSON");
        }
        
        throw new Error(`API request failed with status ${response.status}: ${responseText}`);
      }

      // Try to validate the response is JSON
      try {
        JSON.parse(responseText); // Just to validate
        return responseText; // Return the raw text if it's valid JSON
      } catch (parseError) {
        console.error("[BlueprintGenerationService] Response is not valid JSON:", parseError);
        throw new Error('API response is not valid JSON');
      }

    } catch (error) {
      console.error("[BlueprintGenerationService] API Call Error:", error);
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Blueprint generation failed: ${message}`);
    }
  }

  /**
   * Export blueprint data to Unreal format
   */
  static async exportToUnreal(blueprint: any): Promise<string> {
    console.log("[BlueprintGenerationService] Exporting blueprint:", blueprint);
    return JSON.stringify(blueprint, null, 2);
  }

  /**
   * Save blueprint as a template
   */
  static async saveAsTemplate(blueprint: any): Promise<void> {
    console.log("[BlueprintGenerationService] Saving blueprint as template:", blueprint);
    // Implementation pending
  }
} 