import os
import json
import logging
import google.generativeai as genai
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load .env file
load_dotenv()

# Import the instructions and examples from index.py
from index import INSTRUCTIONS, EXAMPLES

# Get API key from environment
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    logger.error("GEMINI_API_KEY not found in environment")
    exit(1)

# Configure Gemini
genai.configure(api_key=API_KEY)

# Define safety settings and generation config (same as in index.py)
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

# Initialize model
model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config=generation_config,
    safety_settings=safety_settings
)

def test_gemini_api(query_text):
    """Test the Gemini API with a given query text."""
    logger.info(f"Testing Gemini API with query: {query_text}")
    
    try:
        # Create the prompt
        user_request = f"\n      USER QUERY:\n      \"{query_text}\"\n\n      JSON Output:\n    "
        full_prompt = f"{INSTRUCTIONS}\n{EXAMPLES}\n{user_request}"
        
        # Call the API
        logger.info("Sending prompt to Gemini...")
        response = model.generate_content(full_prompt)
        response_text = response.text
        
        # Log the raw response
        logger.info("Raw response from Gemini API:")
        print("\n\n--- BEGIN RAW RESPONSE ---")
        print(response_text)
        print("--- END RAW RESPONSE ---\n\n")
        
        # Try to parse as JSON
        try:
            import re
            # Try to extract JSON from markdown code blocks if present
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
            if json_match:
                logger.info("Found JSON in markdown code block")
                extracted_json = json_match.group(1).strip()
                print("--- EXTRACTED JSON FROM CODE BLOCK ---")
                print(extracted_json)
                print("--- END EXTRACTED JSON ---\n")
                
                # Try to parse the extracted JSON
                blueprint_json = json.loads(extracted_json)
                logger.info("Successfully parsed extracted JSON")
                return True
            else:
                # Try to parse the raw response
                blueprint_json = json.loads(response_text)
                logger.info("Successfully parsed raw response as JSON")
                return True
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse response as JSON: {e}")
            print(f"JSON Parse Error: {e}")
            return False
            
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}")
        print(f"API Error: {e}")
        return False

if __name__ == "__main__":
    # Test with a simple query
    test_queries = [
        "Make a blueprint that prints Hello World",
        "When player presses Shift key, make them sprint",
        "Create a health regeneration system"
    ]
    
    for query in test_queries:
        print(f"\n\nTesting with query: {query}")
        success = test_gemini_api(query)
        print(f"Test result: {'SUCCESS' if success else 'FAILURE'}")
        print("-" * 50) 
 
 
 