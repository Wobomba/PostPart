from flask import Blueprint, render_template, request, redirect, url_for
from app import db
from app.models import QuestionBank, UserResponses
from datetime import datetime

main = Blueprint('main', __name__)

@main.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        user_name = request.form.get('name')
        user_department = request.form.get('department')
        
        return redirect(url_for('main.questions', name=user_name, department=user_department))

    return render_template('index.html')

@main.route('/questions')
def questions():
    department = request.args.get('department')
    print(f"Fetching questions for department: {department}")  # Debug statement
    questions = QuestionBank.query.filter_by(department=department).all()
    
    #testing print functionality from the database
    print(f"Questions fetched: {questions}")

    return render_template('questions.html', questions=questions)

@main.route('/submit_answer', methods=['POST'])
def submit_answer():
    question_id = request.form.get('question_id')
    user_answer = request.form.get('answer')
    correct_answer = QuestionBank.query.filter_by(question_id=question_id).first().correct_answer
    
    score = QuestionBank.query.filter_by(question_id=question_id).first().passing_score if user_answer == correct_answer else QuestionBank.query.filter_by(question_id=question_id).first().failing_score
    
    new_response = UserResponses(
        user_id=1,  # User's ID of the logged in person
        timestamp=datetime.now(),
        name=request.form.get('name'),
        score=score,
        question_id=question_id
    )
    
    db.session.add(new_response)
    db.session.commit()

    return redirect(url_for('main.index'))

@main.route('/test_db')
def test_db():
    questions = QuestionBank.query.all()
    if questions:
        return f"Database has {len(questions)} questions."
    else:
        return "No questions found in the database."
