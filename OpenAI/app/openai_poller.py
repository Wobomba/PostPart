import openai
from app.config import Config

# Setting OpenAI API key
openai.api_key = Config.OPENAI_API_KEY

def fetch_questions(prompt):
    try:
        
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",  # using gtp-4o-mini engine
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000
        )
        
        return response.choices[0].message['content']
    except Exception as e:
        print(f"Error fetching questions: {e}")
        return None