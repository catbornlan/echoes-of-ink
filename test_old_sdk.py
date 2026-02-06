"""Test old SDK with new API key"""
import google.generativeai as genai
from backend.config import config

genai.configure(api_key=config.get_gemini_api_key())

models = ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']

for model_name in models:
    try:
        print(f"\n尝试: {model_name}")
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("用5个字说你好")
        print(f"✅ 成功! 响应: {response.text}")
        break
    except Exception as e:
        print(f"❌ 失败: {str(e)[:150]}")
