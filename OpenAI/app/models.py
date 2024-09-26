from app import db
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
    user_id = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False)
    name = db.Column(db.String(50), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    question_id = db.Column(db.String(10), db.ForeignKey('question_bank.question_id'), nullable=False)
