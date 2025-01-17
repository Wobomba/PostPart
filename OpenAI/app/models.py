from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

# User model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    # One-to-many relationship with UserResponses
    responses = db.relationship('UserResponses', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

#questionbank db with the table fields
class QuestionBank(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.String(10), unique=True, nullable=False)
    question = db.Column(db.String(255), nullable=False)
    answers = db.Column(db.String(500), nullable=False)
    correct_answer = db.Column(db.String(5), nullable=False)
    passing_score = db.Column(db.Integer, nullable=False)
    failing_score = db.Column(db.Integer, nullable=False)
    difficulty_level = db.Column(db.String(10), nullable=False)
    department = db.Column(db.String(50), nullable=False)

#userresponse db with the table fields
class UserResponses(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Define foreign key relationship
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    name = db.Column(db.String(50), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    question_id = db.Column(db.String(10), db.ForeignKey('question_bank.question_id'), nullable=False)

    # Establish relationship with QuestionBank
    question = db.relationship('QuestionBank', backref=db.backref('responses', lazy=True))