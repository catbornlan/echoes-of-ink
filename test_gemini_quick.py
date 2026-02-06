"""Quick test of Gemini API"""
import google.generativeai as genai
from backend.config import config

genai.configure(api_key=config.get_gemini_api_key())

# Try different model names
models_to_try = [
    'gemini-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
]

for model_name in models_to_try:
    try:
        print(f"\n尝试模型: {model_name}")
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Say hello in Chinese in 5 words")
        print(f"✅ 成功! 响应: {response.text}")
        break
    except Exception as e:
        print(f"❌ 失败: {str(e)[:200]}")
