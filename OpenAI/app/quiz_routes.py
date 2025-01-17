from flask import Blueprint, redirect, render_template, request, session, url_for
from app.models import QuestionBank
from app import db
import json

quiz_bp = Blueprint('quiz', __name__)

@quiz_bp.route('/quiz', methods=['GET'])
def quiz_page():
    """
    Fetch and display a question for the selected department.
    Redirect to select_department if no department is set in the session.
    """
    # Retrieve the department from the session
    department = session.get('department', '').strip()

    # Redirect to select_department if no department is set
    if not department:
        return redirect(url_for('auth.select_department'))

    # Fetch a random question for the selected department
    question = QuestionBank.query.filter_by(department=department).order_by(db.func.random()).first()
    if not question:
        return "No questions available for this department.", 404

    # Convert answers JSON to a Python dictionary (if stored as JSON)
    question.answers = json.loads(question.answers) if isinstance(question.answers, str) else question.answers

    # Generate the URL for submit_response dynamically
    submit_url = url_for('fetch.submit_response')

    return render_template('quiz.html', question=question, submit_url=submit_url)


@quiz_bp.route('/quiz/result', methods=['GET'])
def result_page():
    """
    Displays the result of the quiz submission.
    """
    is_correct = request.args.get('is_correct') == 'True'
    return render_template('result.html', is_correct=is_correct)
