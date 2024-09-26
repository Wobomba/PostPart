import openai
from app import db
from app.models import QuestionBank
import json

def fetch_questions(prompt):
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",  
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500  # Adjust the max tokens as needed
        )

        questions_text = response.choices[0].message['content']
        start_index = questions_text.find('[')
        end_index = questions_text.rfind(']') + 1
        json_text = questions_text[start_index:end_index]
        questions = json.loads(json_text)

        # Get the highest existing question_id in the database
        last_question = QuestionBank.query.order_by(QuestionBank.question_id.desc()).first()
        if last_question:
            last_id_num = int(last_question.question_id[1:])  # Extract the numeric part (e.g., "001")
        else:
            last_id_num = 0  # Start from 0 if no questions exist

        # Insert each question with a new unique ID
        for i, q in enumerate(questions, start=1):
            new_question_id = f"Q{last_id_num + i:03d}"  # Format the new ID as "Q###"

            # Check if a question with this exact question_id content already exists 
            existing_question = QuestionBank.query.filter_by(question=q['Question']).first()
            if existing_question:
                print(f"Question with content '{q['Question']}' already exists, skipping.")
                continue

            # Add new question with a unique ID
            new_question = QuestionBank(
                question_id=new_question_id,
                question=q['Question'],
                answers=json.dumps(q['Answers']),  # Convert dict to JSON string
                correct_answer=q['Correct_answer'],
                passing_score=q['Passing_score'],
                failing_score=q['Failing_score'],
                difficulty_level=q['Difficulty_level'],
                department=q['Department']
            )
            db.session.add(new_question)

        # Commit the new questions to the database
        db.session.commit()

        return questions

    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        return None
    except Exception as e:
        print(f"Error fetching questions: {e}")
        return None
