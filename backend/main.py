from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import openai
import os
from datetime import datetime
import jwt
from passlib.context import CryptContext
from app.database import get_db, engine
from app import models
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import json
import traceback
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()

# OpenAI API ayarları
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    raise ValueError("OPENAI_API_KEY environment variable is not set")

# OAuth2 ve JWT ayarları
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is not set")

ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Veritabanı tablolarını oluştur
models.Base.metadata.create_all(bind=engine)

class StageDetail(BaseModel):
    title: str
    description: str
    activities: List[dict]

class RoadmapCreate(BaseModel):
    goal: str
    duration: int

@app.get("/api/roadmap/stage/{roadmap_id}/{stage_id}")
async def get_stage_detail(roadmap_id: int, stage_id: int, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    try:
        print(f"\n=== Stage Detail Request ===")
        print(f"Roadmap ID: {roadmap_id}")
        print(f"Stage ID: {stage_id}")
        
        # Token doğrulama
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if user_id is None:
                print(f"Invalid token: sub claim is missing")
                raise HTTPException(status_code=401, detail="Invalid token")
            print(f"Token validated, user_id: {user_id}")
        except jwt.JWTError as e:
            print(f"JWT Error: {str(e)}")
            raise HTTPException(status_code=401, detail="Invalid token")

        # Roadmap'i bul
        roadmap = db.query(models.Roadmap).filter(
            models.Roadmap.id == roadmap_id,
            models.Roadmap.user_id == user_id
        ).first()

        if not roadmap:
            print(f"Roadmap not found for ID: {roadmap_id} and user_id: {user_id}")
            raise HTTPException(status_code=404, detail="Roadmap not found")

        # Content'i satırlara böl
        content_lines = [line.strip() for line in (roadmap.content or "").split('\n') if line.strip()]
        stage_index = stage_id - 1  # 1-indexed

        if stage_index < 0 or stage_index >= len(content_lines):
            print(f"Stage not found. Total stages: {len(content_lines)}, requested stage: {stage_id}")
            raise HTTPException(status_code=404, detail="Stage not found")

        stage_title = content_lines[stage_index]
        print(f"Found stage title: {stage_title}")

        # Yanıtı oluştur
        return {
            "title": stage_title,
            "description": f"{stage_title} için detaylı açıklama ve aktiviteler",
            "activities": [
                {
                    "title": "Öğrenme Hedefleri",
                    "description": f"{stage_title} konusunda öğrenilecek temel kavramlar ve beceriler",
                    "resources": [
                        {
                            "title": "Önerilen Kaynak",
                            "url": "#"
                        }
                    ]
                }
            ]
        }
            
    except Exception as e:
        print(f"Error in get_stage_detail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/roadmap")
async def create_roadmap(roadmap: RoadmapCreate, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    try:
        print(f"\n=== Create Roadmap Request ===")
        print(f"Goal: {roadmap.goal}")
        print(f"Duration: {roadmap.duration}")
        
        # Token doğrulama
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if user_id is None:
                print(f"Invalid token: sub claim is missing")
                raise HTTPException(status_code=401, detail="Invalid token")
            print(f"Token validated, user_id: {user_id}")
        except jwt.JWTError as e:
            print(f"JWT Error: {str(e)}")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # GPT API'ye gönderilecek prompt
        prompt = f"""
        {roadmap.goal} hedefine ulaşmak için {roadmap.duration} günlük detaylı bir öğrenme yol haritası oluştur.
        Her gün için:
        1. Öğrenilecek konular
        2. Pratik uygulamalar
        3. Önerilen kaynaklar (kitaplar, makaleler, videolar, kurslar)
        4. Öğrenme çıktıları

        Yanıtı şu JSON formatında ver:
        {{
            "title": "Yol Haritası Başlığı",
            "description": "Genel açıklama",
            "steps": [
                {{
                    "title": "Gün 1: Başlık",
                    "description": "Gün 1 açıklaması",
                    "resources": [
                        {{"title": "Kaynak başlığı", "url": "kaynak_url"}}
                    ]
                }}
            ]
        }}
        """
        
        print(f"Sending prompt to GPT API: {prompt}")
        
        # GPT API'ye istek at
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Sen bir eğitim danışmanısın. Detaylı ve pratik öğrenme yol haritaları oluşturuyorsun."},
                    {"role": "user", "content": prompt}
                ]
            )
            
            print(f"GPT API response received")
            
            # GPT yanıtını parse et
            try:
                content = response.choices[0].message.content
                print(f"GPT content: {content}")
                roadmap_data = json.loads(content)
                
                # Ana roadmap kaydı
                new_roadmap = models.Roadmap(
                    user_id=user_id,
                    title=roadmap_data['title'],
                    description=roadmap_data['description'],
                    duration=roadmap.duration,
                    content="\n".join([step['title'] for step in roadmap_data['steps']])
                )
                db.add(new_roadmap)
                db.flush()  # ID'yi almak için flush
                
                print(f"Created roadmap with ID: {new_roadmap.id}")
                
                # Adımları kaydet
                for index, step in enumerate(roadmap_data['steps']):
                    new_step = models.RoadmapStep(
                        roadmap_id=new_roadmap.id,
                        day_number=index + 1,
                        topic=step['title'],
                        description=step['description'],
                        resources=json.dumps(step['resources'])
                    )
                    db.add(new_step)
                    print(f"Created step {index + 1} for roadmap {new_roadmap.id}")
                
                db.commit()
                print("Database transaction committed successfully")
                
                return {
                    "id": new_roadmap.id,
                    "title": new_roadmap.title,
                    "description": new_roadmap.description,
                    "duration": new_roadmap.duration,
                    "steps": roadmap_data['steps']
                }
                
            except json.JSONDecodeError as e:
                print(f"JSON parse error: {e}")
                raise HTTPException(status_code=500, detail="Error parsing GPT response")
                
        except Exception as e:
            print(f"GPT API error: {e}")
            raise HTTPException(status_code=500, detail=f"Error calling GPT API: {str(e)}")
            
    except HTTPException as he:
        print(f"HTTP Exception: {he.detail}")
        raise he
    except Exception as e:
        print(f"Unexpected error: {e}")
        print(f"Error traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/roadmaps")
async def get_roadmaps(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    try:
        # Token doğrulama
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if user_id is None:
                raise HTTPException(status_code=401, detail="Invalid token")
        except jwt.JWTError as e:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Kullanıcının yol haritalarını getir
        roadmaps = db.query(models.Roadmap).filter(
            models.Roadmap.user_id == user_id
        ).order_by(models.Roadmap.created_at.desc()).all()

        # Yol haritalarını JSON formatına dönüştür
        roadmap_list = []
        for roadmap in roadmaps:
            roadmap_list.append({
                "id": roadmap.id,
                "title": roadmap.title,
                "description": roadmap.description,
                "duration": roadmap.duration,
                "content": roadmap.content,
                "created_at": roadmap.created_at.isoformat() if roadmap.created_at else None
            })

        return roadmap_list

    except Exception as e:
        print(f"Error in get_roadmaps: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ... rest of the code ... 