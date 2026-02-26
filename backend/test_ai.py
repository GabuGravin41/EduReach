import os
import django
from dotenv import load_dotenv

load_dotenv(override=True)
os.environ['ENVIRONMENT'] = 'development'
os.environ['DEBUG'] = 'True'
os.environ['IS_RUNSERVER'] = 'True'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edureach_project.settings')
django.setup()

from ai_service.views import call_ai

def test_ai():
    print("Testing AI call (OpenRouter Prefer)...")
    try:
        response = call_ai("Say 'AI Test Successful'", prefer_openrouter=True)
        print(f"SUCCESS (OpenRouter): {response}")
    except Exception as e:
        print(f"FAILED (OpenRouter): {type(e).__name__}: {e}")
        if hasattr(e, 'details'):
            print("DETAILS:")
            for detail in e.details:
                print(f"  - {detail}")

    print("\nTesting AI call (Gemini Prefer)...")
    try:
        response = call_ai("Say 'AI Test Successful'", prefer_openrouter=False)
        print(f"SUCCESS (Gemini): {response}")
    except Exception as e:
        print(f"FAILED (Gemini): {type(e).__name__}: {e}")
        if hasattr(e, 'details'):
            print("DETAILS:")
            for detail in e.details:
                print(f"  - {detail}")

if __name__ == "__main__":
    test_ai()
