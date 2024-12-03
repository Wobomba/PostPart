from flask import Blueprint, render_template, request
from app.models import QuestionBank
from app import db
import json

quiz = Blueprint('quiz', __name__)

@quiz.route('/quiz')
def quiz_page():
    """
    Fetch and display a question for the selected department.
    """
    department = request.args.get('department', '').strip()
    if not department:
        return "Department is required", 400

    # Query a random question for the selected department
    question = QuestionBank.query.filter_by(department=department).order_by(db.func.random()).first()

    if not question:
        return f"No questions available for the {department} department.", 404

    # Format the question for the template
    formatted_question = {
        "id": question.question_id,
        "question": question.question,
        "options": [
            {"text": answer, "correct": key == question.correct_answer}
            for key, answer in json.loads(question.answers).items()
        ],
    }

    return render_template('quiz.html', question=formatted_question, department=department)
