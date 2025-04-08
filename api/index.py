# noder/api/index.py
# This file defines a Flask application for the Noder API.
# It can be deployed on Render or Vercel.

import os
import json
import logging
import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.middleware.proxy_fix import ProxyFix
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables from .env file if present (mainly for local dev)
# In Vercel, variables are set in the project settings
load_dotenv()

# --- Prompt Definitions ---
# (Keep the INSTRUCTIONS and EXAMPLES strings exactly as they were in server.py)
INSTRUCTIONS = """
You are an expert Unreal Engine Blueprint assistant.
Your task is to analyze the user's request and generate a JSON object representing the necessary Blueprint nodes, their pins, color, default input values, and connections for a single blueprint graph.

The JSON output MUST strictly follow this format:
{
  "blueprintName": "Optional short name for the graph",
  "blueprintDescription": "Optional brief description",
  "nodes": [
    {
      "id": "unique_temporary_node_id",
      "title": "Exact Unreal Engine Node Title",
      "nodeType": "event | function | variable | macro",
      "color": "#RRGGBB or suggested color name",
      "inputs": [ { "name": "Exact Pin Name", "type": "PinType", "value": value_or_null } /* ... ALL pins IN ORDER */ ],
      "outputs": [ { "name": "Exact Pin Name", "type": "PinType" } /* ... ALL pins IN ORDER */ ]
    }
  ],
  "connections": [
    {
      "sourceNodeId": "temporary_id_of_source_node",
      "sourcePinName": "Exact OUTPUT Pin Name",
      "targetNodeId": "temporary_id_of_target_node",
      "targetPinName": "Exact INPUT Pin Name"
    }
  ]
}

IMPORTANT RULES:
- Node ID Uniqueness: Must be unique within the response.
- Accuracy: Use exact UE node titles and pin names (case-sensitive).
- Pins: Include COMPLETE and ACCURATE inputs/outputs arrays for ALL standard pins, in order. Use exact PinTypes. Do NOT use empty strings ("") for pin names; use descriptive names. Provide sensible default 'value' or null (JSON keyword null, not 'None') for unconnected INPUT pins. Use JSON booleans true/false (lowercase).
- Color: Use color accurate to Unreal's blueprint colors.
- Connections: CRITICAL: sourcePinName MUST exist in source node's outputs. targetPinName MUST exist in target node's inputs. Ensure types are compatible.
- Appropriate Node Types: Use the correct node type for the node.
- Minimality: Only include essential nodes/connections but fulfill user request; generate a good amount of tokens.
- Output Format: ONLY the pure, valid JSON object. NO comments. Pay strict attention to JSON syntax (quotes, commas, NO trailing commas).
- Handle unknown nodes: Use your knowledge to generate nodes not in a predefined database, ensuring they are accurate.
"""

EXAMPLES = """
EXAMPLE 1:
User Query: "When I press Space Bar, make the character jump"
JSON Output:
{
  "blueprintName": "BP_MyCharacter_Jump",
  "blueprintDescription": "Makes the character jump when Space Bar is pressed.",
  "nodes": [
    {"id": "node-1", "title": "InputAction Jump", "nodeType": "event", "color": "#B71C1C", "inputs": [], "outputs": [{ "name": "Pressed", "type": "exec" }, { "name": "Released", "type": "exec" }, { "name": "Key", "type": "object" }] },
    {"id": "node-2", "title": "Jump", "nodeType": "function", "color": "#1E88E5", "inputs": [{ "name": "Execute", "type": "exec", "value": null }, { "name": "Target", "type": "object", "value": null }], "outputs": [{ "name": "Execute", "type": "exec" }] },
    {"id": "node-3", "title": "Get Player Character", "nodeType": "function", "color": "#1E88E5", "inputs": [{ "name": "Player Index", "type": "int", "value": 0 }], "outputs": [{ "name": "Return Value", "type": "object" }] }
  ],
  "connections": [
    {"sourceNodeId": "node-1", "sourcePinName": "Pressed", "targetNodeId": "node-2", "targetPinName": "Execute"},
    {"sourceNodeId": "node-3", "sourcePinName": "Return Value", "targetNodeId": "node-2", "targetPinName": "Target"}
  ]
}

EXAMPLE 2:
User Query: "On begin play in the Level Blueprint, print Hello World"
JSON Output:
{
  "blueprintName": "LevelBlueprint_DebugPrint",
  "blueprintDescription": "Prints Hello World when the game starts.",
  "nodes": [
    {"id": "startNode", "title": "Event BeginPlay", "nodeType": "event", "color": "#B71C1C", "inputs": [], "outputs": [{ "name": "Execute", "type": "exec" }] },
    {"id": "printNode", "title": "Print String", "nodeType": "function", "color": "#004D40", "inputs": [{ "name": "Execute", "type": "exec", "value": null }, { "name": "In String", "type": "string", "value": "Hello World" }, { "name": "Print to Screen", "type": "bool", "value": true }, { "name": "Print to Log", "type": "bool", "value": true }, { "name": "Text Color", "type": "vector", "value": "(R=0.0,G=0.66,B=1.0,A=1.0)" }, { "name": "Duration", "type": "float", "value": 2.0 }], "outputs": [{ "name": "Execute", "type": "exec" }] }
  ],
  "connections": [
    {"sourceNodeId": "startNode", "sourcePinName": "Execute", "targetNodeId": "printNode", "targetPinName": "Execute"}
  ]
}
"""
# --- End Prompt Definitions ---

# Configure Flask App
# Vercel expects the Flask app instance to be named 'app'
app = Flask(__name__)

# Enable CORS with more specific configuration
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5173",  # Local development
            "https://noder.vercel.app",  # Production Vercel deployment
            "https://noder-taupe.vercel.app", # Specific preview deployment causing issues
            # Add a pattern for Vercel preview deployments if needed
            # "https://noder-*-yourusername.vercel.app", 
            os.getenv("FRONTEND_URL", ""), # Custom frontend URL from environment
            os.getenv("VERCEL_URL", ""), # Automatically add Vercel deployment URL
            os.getenv("VERCEL_BRANCH_URL", "") # Automatically add Vercel branch preview URL
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True # May be needed depending on auth
    }
})

# Fix for running behind a proxy (like Render)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

# Configure Gemini API
# IMPORTANT: Read the API Key from environment variables.
# Vercel will inject environment variables defined in the project settings.
API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.0-flash" # Or your desired model

if not API_KEY:
    logger.error("FATAL ERROR: GEMINI_API_KEY environment variable not set.")
    # In a serverless function, raising an exception is often better than exit()
    # Flask's error handling might catch this, or Vercel might log it.
    # Returning a clear error response is also good practice here.
    # For simplicity now, we log and proceed, but the API call will fail.
    pass # Let the API call fail later if key is missing

genai.configure(api_key=API_KEY)

# Define safety settings and generation config
safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

generation_config = {
    "temperature": 0.3,
    "top_p": 1,
    "top_k": 1,
    "max_output_tokens": 8192,
}

# Initialize the Generative Model
# Handle potential error during initialization if API key is invalid/missing
try:
    model = genai.GenerativeModel(model_name=MODEL_NAME,
                                  generation_config=generation_config,
                                  safety_settings=safety_settings)
    logger.info("Successfully initialized Gemini model")
except Exception as init_error:
    logger.error(f"Failed to initialize GenerativeModel: {init_error}")
    model = None # Ensure model is None if initialization fails

# Note: Vercel routes requests based on the filename in the api/ directory.
# A request to /api/generateBlueprint will be routed here if this file is api/index.py
# and the function handles the '/api/generateBlueprint' route.
# Alternatively, if the file was api/generateBlueprint.py, requests to /api/generateBlueprint
# would be routed directly to a handler function within that file without Flask routing.
# Using Flask allows multiple routes in one file.

@app.route('/api/generateBlueprint', methods=['POST'])
def generate_blueprint_handler():
    if not model:
        logger.error("Model not initialized. Check API Key and configuration.")
        return jsonify({"error": "Model failed to initialize. Check API Key and configuration."}), 500
         
    if not request.is_json:
        logger.warning("Request is not JSON")
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    query_text = data.get('query') # Renamed variable for clarity

    if not query_text or not isinstance(query_text, str):
        logger.warning(f"Invalid query: {query_text}")
        return jsonify({"error": 'Missing or invalid "query" in request body.'}), 400

    try:
        user_request = f"\n      USER QUERY:\n      \"{query_text}\"\n\n      JSON Output:\n    "
        full_prompt = f"{INSTRUCTIONS}\n{EXAMPLES}\n{user_request}"

        logger.info(f"Sending prompt to Gemini for query: {query_text[:50]}...")
        response = model.generate_content(full_prompt)
        response_text = response.text
        logger.info("Received raw response from Gemini")

        # Basic validation
        if '{' not in response_text or '}' not in response_text:
            logger.error(f"LLM response did not contain JSON object delimiters: {response_text[:500]}...")
            raise ValueError("LLM response does not appear to contain JSON.")

        # Enhanced debugging for the raw response
        logger.info(f"Raw LLM response (first 1000 chars): {response_text[:1000]}")
        
        # Try to extract JSON if it's wrapped in markdown or other text
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```', response_text)
        if json_match:
            logger.info("Found JSON wrapped in markdown code block")
            response_text = json_match.group(1)
        else:
            # Try to find JSON between curly braces if not in code block
            json_match = re.search(r'(\{[\s\S]*\})', response_text)
            if json_match:
                logger.info("Extracted JSON object using regex")
                response_text = json_match.group(1)
                
        # Clean response by removing any non-JSON text before/after
        response_text = response_text.strip()
        
        # IMPORTANT: Return JSON for frontend compatibility
        # The frontend likely expects a JSON object based on previous interactions
        # We assume the LLM returns a *string* that is valid JSON.
        # We parse it here before sending.
        # If the LLM response isn't valid JSON, this will raise an error.
        blueprint_json = json.loads(response_text)
        logger.info("Successfully parsed JSON response")
        return jsonify(blueprint_json), 200

    except json.JSONDecodeError as json_err:
        logger.error(f"Failed to parse LLM response as JSON: {json_err}")
        logger.error(f"LLM Raw Response: {response_text}")
        
        # Try to clean the response more aggressively
        cleaned_response = response_text.strip()
        # Remove any leading/trailing text that might be causing issues
        if cleaned_response.startswith('{') and cleaned_response.endswith('}'):
            try:
                # Try one more time with a more aggressively cleaned string
                cleaned_json = json.loads(cleaned_response)
                logger.info("Successfully parsed JSON after cleaning")
                return jsonify(cleaned_json), 200
            except json.JSONDecodeError:
                logger.error("Still failed to parse after cleaning")
        
        # Get position info from the error to help debug
        error_info = str(json_err)
        logger.error(f"JSON Error Position Info: {error_info}")
        
        # Return a more detailed error to help with debugging
        return jsonify({
            "error": "Failed to generate blueprint: Invalid format from generation service.",
            "raw_error": str(json_err),
            "error_type": "json_parse_error",
            "response_preview": response_text[:200] + "..." if len(response_text) > 200 else response_text
        }), 500
    except Exception as e:
        logger.error(f"Error calling Gemini API or processing response: {e}")
        # Avoid sending detailed internal errors to the client
        return jsonify({"error": "Failed to generate blueprint: Server error"}), 500

@app.route('/api/health', methods=['GET'])
def health_check_handler():
    # Check if model initialized correctly
    status = "OK"
    if not API_KEY:
        status = "ERROR: Missing GEMINI_API_KEY"
    elif not model:
        status = "ERROR: Model initialization failed"
        
    logger.info(f"Health check: {status}")
    return jsonify({"status": status}), 200 if status == "OK" else 500

# Vercel runs the Flask app instance named 'app'. No need for app.run() here.
# The file structure api/index.py makes Vercel treat this as the handler for /api/* 

# For local development
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port) 