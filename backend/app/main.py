from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, database
from .database import engine, get_db
from .routes.auth import router as auth_router, get_current_user
import openai
import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path

# .env dosyasının yolunu belirle
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Veritabanı tablolarını oluştur
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth router'ı ekle
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

# OpenAI API anahtarını environment variable'dan al
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    print(f"Current working directory: {os.getcwd()}")
    print(f"Looking for .env file at: {env_path}")
    print(f"Environment variables: {dict(os.environ)}")
    raise ValueError("OPENAI_API_KEY environment variable is not set")

@app.post("/api/roadmap")
async def create_roadmap(
    request: Request, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        data = await request.json()
        goal = data.get("goal")
        days = data.get("days")

        if not goal or not days:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hedef ve gün sayısı gereklidir"
            )

        prompt = f"""
Konu: {goal}  
Süre: {days} gün

Lütfen her gün için yalnızca bir tane konu başlığı üret.  
Aşağıdaki kurallara **kesinlikle** uy:

- Toplam {days} gün olacak şekilde sadece konu başlıkları ver.  
- Her günün başlığını 1., 2., 3. ... şeklinde alt alta numaralandır.  
- Cevabında açıklama, plan, aktivite, kaynak, kontrol noktası veya başka bilgi yer almasın.  
- "Öğrenme planı", "başarılar" gibi kalıplar kesinlikle yazılmasın.  
- Cevap yalnızca konu başlıklarından oluşsun.  
- Yanıtın tamamı Türkçe olmalı.

Beklenen çıktı sadece şu formatta olmalı:

1. ...
2. ...
3. ...
...
"""

        client = openai.OpenAI(api_key=openai_api_key)
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": (
                    "Sen yalnızca öğrenme konu başlıkları üreten bir yapay zekâsın. "
    "Kullanıcıdan gelen konu ve süre bilgisine göre, her gün için yalnızca bir konu başlığı üret. "
    "Sadece gün numarası ve konu başlığı ver. "
    "Açıklama, plan, aktivite, kaynak, kontrol noktası, başarılar dileği gibi şeyler yazma. "
    "Çıktının tamamı yalnızca Türkçe olacak. "
    "Çıktı yalnızca konu başlıkları içermeli ve 1., 2., 3. ... şeklinde numaralandırılmalı. "
    "Konu başlıkları dışında hiçbir şey yazma."
                )
                },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.7
            )
        )
        roadmap_content = response.choices[0].message.content
        
        # Veritabanına kaydet
        db_roadmap = models.Roadmap(
            title=goal,
            description=f"{days} günlük yol haritası",
            content=roadmap_content,
            user_id=current_user.id
        )
        db.add(db_roadmap)
        db.commit()
        db.refresh(db_roadmap)
        
        return {
            "id": db_roadmap.id,
            "title": db_roadmap.title,
            "description": db_roadmap.description,
            "content": db_roadmap.content,
            "created_at": db_roadmap.created_at
        }
    except Exception as e:
        print(f"Error creating roadmap: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Yol haritası oluşturulurken bir hata oluştu"
        )

@app.get("/api/roadmaps")
def get_user_roadmaps(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    roadmaps = db.query(models.Roadmap).filter(models.Roadmap.user_id == current_user.id).all()
    return roadmaps

@app.get("/api/roadmaps/{roadmap_id}")
def get_roadmap(
    roadmap_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    roadmap = db.query(models.Roadmap).filter(
        models.Roadmap.id == roadmap_id,
        models.Roadmap.user_id == current_user.id
    ).first()
    
    if not roadmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Yol haritası bulunamadı"
        )
    
    return roadmap

@app.post("/api/gpt")
async def get_gpt_response(request: Request):
    try:
        data = await request.json()
        prompt = data.get("prompt")
        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")

        client = openai.OpenAI(api_key=openai_api_key)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Sen bir eğitim danışmanısın. Detaylı ve pratik öğrenme yol haritaları oluşturuyorsun."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )

        return {"description": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))