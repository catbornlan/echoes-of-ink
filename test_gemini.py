import os
import google.generativeai as genai
from dotenv import load_dotenv

def test_connection():
    print("Testing Gemini API connection...")
    
    # Load .env
    # Explicitly look for .env in current directory
    if not load_dotenv('.env'):
        print("Error: .env file not found or could not be loaded.")
        # Try without path just in case
        load_dotenv()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env file.")
        print("Current Environment Variables:", list(os.environ.keys()))
        return
        
    print(f"API Key found: {api_key[:5]}...{api_key[-5:] if len(api_key) > 10 else ''}")

    try:
        genai.configure(api_key=api_key)
        
        print("\n1. Listing available models for your API key...")
        found_models = []
        try:
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    found_models.append(m.name)
                    print(f"   - {m.name}")
        except Exception as e:
            print(f"   Warning: Could not list models. Error: {e}")
            
        # 优先使用 1.5-flash，这是当前最稳定的版本
        target_models = ['gemini-1.5-flash', 'gemini-1.5-pro']
        # Also try models found in list if not in target
        for m in found_models:
            clean_name = m.replace('models/', '')
            if clean_name not in target_models:
                target_models.append(clean_name)

        print(f"\n2. Testing generation with candidates: {target_models}")
        
        for model_name in target_models:
            print(f"\nAttempting model: {model_name}...")
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content("Hello, are you there?")
                
                print(f"✅ Connection Successful using {model_name}!")
                print("-" * 30)
                print(f"Response: {response.text}")
                print("-" * 30)
                return # Exit after first success
                
            except Exception as e:
                print(f"   ❌ Failed: {str(e)}")
        
        print("\n❌ All model attempts failed.")
        print("Please check your API Key permissions or network connection.")

    except Exception as e:
        print(f"\n❌ Fatal Error: {str(e)}")

if __name__ == "__main__":
    test_connection()
