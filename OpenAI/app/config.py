import os

class Config:
    SQLALCHEMY_DATABASE_URI = 'sqlite:////home/newton/Documents/Projects/OpenAI/instance/question_bank.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.urandom(24)
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    MAIL_SERVER = 'webmail.renu.ac.ug'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = 'iwobomba@renu.ac.ug'  
    MAIL_PASSWORD = 'test-creds'   
    MAIL_DEFAULT_SENDER = 'iwobomba@renu.ac.ug'  
