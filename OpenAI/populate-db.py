from app import create_app, db
from app.models import QuestionBank
from app.openai_poller import fetch_questions
import json

# Initialize the Flask app
app = create_app()

# Define the department directly (replace with the desired department)
department = "Internal Audit"

# Define the prompt
questions_per_department = 10  # Specify how many questions per department
prompt = f"""
Generate {questions_per_department} multiple-choice security awareness questions for the {department}.
Each question must be tailored to the responsibilities of the {department} in the context of a National Research and Education Network (NREN).
Provide the output in valid JSON format with the following structure:
[
    {{
        "Id": "Q001",
        "Question": "What is the primary purpose of encryption?",
        "Answers": {{
            "A": "To secure data",
            "B": "To delete data",
            "C": "To back up data",
            "D": "To compress data"
        }},
        "Correct_answer": "A",
        "Hint": "Think about confidentiality and data protection.",
        "Passing_score": 10,
        "Failing_score": -5,
        "Difficulty_level": "Medium",
        "Department": "{department}"
    }}
]
"""


with app.app_context():
    # Fetch questions from OpenAI
    fetched_questions = fetch_questions(prompt)

    if fetched_questions:
        print(f"DEBUG: Fetched {len(fetched_questions)} questions.")
        for q in fetched_questions:
            # Check for duplicates before saving
            existing_question = QuestionBank.query.filter_by(question=q["Question"]).first()
            if existing_question:
                print(f"DEBUG: Skipping duplicate question: {q['Question']}")
                continue

            # Add the question to the database
            question = QuestionBank(
                question_id=q.get("Id"),  # Generate unique IDs if missing
                question=q["Question"],
                answers=json.dumps(q["Answers"]),
                correct_answer=q["Correct_answer"],
                passing_score=q["Passing_score"],
                failing_score=q["Failing_score"],
                difficulty_level=q["Difficulty_level"],
                department=q["Department"]
            )
            db.session.add(question)

        # Commit changes to the database
        try:
            db.session.commit()
            print("Questions added successfully!")
        except Exception as e:
            db.session.rollback()
            print(f"ERROR: Failed to save questions to the database: {e}")
    else:
        print("ERROR: No questions were fetched from OpenAI.")
