"""Test new google.genai SDK"""
from google import genai
from backend.config import config

client = genai.Client(api_key=config.get_gemini_api_key())

# Try different models
models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']

for model_name in models:
    try:
        print(f"\n尝试: {model_name}")
        response = client.models.generate_content(
            model=model_name,
            contents='用5个字说"你好"'
        )
        print(f"✅ 成功! 响应: {response.text}")
        break
    except Exception as e:
        print(f"❌ 失败: {str(e)[:150]}")

