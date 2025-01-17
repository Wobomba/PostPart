import os

class Config:
    SQLALCHEMY_DATABASE_URI = 'sqlite:////home/newton/Documents/Projects/OpenAI/instance/question_bank.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.urandom(24)
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
