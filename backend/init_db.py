import sqlite3
import json
from app.database import Base, engine
from app import models

def init_db():
    # SQLAlchemy modellerini kullanarak tabloları oluştur
    Base.metadata.create_all(bind=engine)
    print("Veritabanı tabloları başarıyla oluşturuldu!")

if __name__ == '__main__':
    init_db() 