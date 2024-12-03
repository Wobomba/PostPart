from app import create_app, db
from app.models import QuestionBank
import json

app = create_app()

with app.app_context():
    sample_questions = [
        {
            "question_id": "Q001",
            "question": "What is the best way to secure your password?",
            "answers": json.dumps({
                "A": "Share it with trusted colleagues",
                "B": "Use a password manager",
                "C": "Write it on sticky notes",
                "D": "Keep the same password for all accounts"
            }),
            "correct_answer": "B",
            "passing_score": 10,
            "failing_score": -5,
            "difficulty_level": "Low",
            "department": "Systems and Software Department"
        }
    ]

    for q in sample_questions:
        question = QuestionBank(
            question_id=q["question_id"],
            question=q["question"],
            answers=q["answers"],
            correct_answer=q["correct_answer"],
            passing_score=q["passing_score"],
            failing_score=q["failing_score"],
            difficulty_level=q["difficulty_level"],
            department=q["department"]
        )
        db.session.add(question)
    db.session.commit()
    print("Sample questions added successfully!")
