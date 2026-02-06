import sys
sys.path.insert(0, '/Users/catborn/Antigravity/test-murder mystery game')

import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

# 获取 API Key
api_key = os.getenv("GEMINI_API_KEY")
print(f"API Key: {api_key[:10]}...")
genai.configure(api_key=api_key)

# 测试调用
model = genai.GenerativeModel('gemini-2.5-flash')

test_prompt = """
你是一个AI导演。请生成一段对话。

返回JSON格式：
[
  {"speaker": "李四", "content": "测试内容", "action": "测试动作", "timestamp": 0}
]
"""

print("\n开始测试 AI 调用...")
try:
    response = model.generate_content(
        test_prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.8,
            max_output_tokens=4096,
        )
    )
    
    print("\n✅ 成功！")
    print(f"响应: {response.text[:200]}...")
    
except Exception as e:
    print(f"\n❌ 失败！")
    print(f"错误类型: {type(e).__name__}")
    print(f"错误信息: {str(e)}")
    
    # 详细错误信息
    import traceback
    print("\n完整堆栈：")
    traceback.print_exc()
