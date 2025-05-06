# Web Application

Bu proje, modern web teknolojileri kullanılarak geliştirilmiş bir web uygulamasıdır. Frontend ve backend olmak üzere iki ana bileşenden oluşmaktadır.

## Kullanılan Teknolojiler

### Frontend
- React.js (v19.1.0)
- React Router DOM (v7.5.3)
- Axios (v1.9.0)
- Webpack
- Jest ve React Testing Library (test için)

### Backend
- FastAPI
- SQLAlchemy (veritabanı ORM)
- SQLite (veritabanı)
- Uvicorn (ASGI sunucusu)
- OpenAI API entegrasyonu
- Python-Jose (JWT kimlik doğrulama)
- Passlib (şifre hashleme)

## Kurulum ve Çalıştırma

### Gereksinimler
- Node.js (v14 veya üzeri)
- Python 3.8 veya üzeri
- pip (Python paket yöneticisi)

### Veritabanı
Uygulama, proje kök dizininde bulunan `app.db` SQLite veritabanı dosyasını kullanmaktadır. Bu dosya otomatik olarak oluşturulacak ve yapılandırılacaktır.

### Backend Kurulumu

1. Backend dizinine gidin:
```bash
cd backend
```

2. Python sanal ortamı oluşturun ve aktifleştirin:
```bash
python -m venv .venv
# Windows için:
.venv\Scripts\activate
# Linux/Mac için:
source .venv/bin/activate
```

3. Gerekli Python paketlerini yükleyin:
```bash
pip install -r requirements.txt
```

4. Veritabanını başlatın:
```bash
python init_db.py
```

5. Backend sunucusunu başlatın:
```bash
uvicorn main:app --reload
```

### Frontend Kurulumu

1. Frontend dizinine gidin:
```bash
cd frontend
```

2. Gerekli npm paketlerini yükleyin:
```bash
npm install
```

3. Geliştirme sunucusunu başlatın:
```bash
npm start
```

## Uygulama Yapısı

- `/frontend`: React.js tabanlı frontend uygulaması
- `/backend`: FastAPI tabanlı backend API'si
- `/database`: Veritabanı şemaları ve migration dosyaları
- `app.db`: SQLite veritabanı dosyası

## API Dokümantasyonu

Backend API dokümantasyonuna aşağıdaki URL'den erişebilirsiniz:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Geliştirme

- Frontend geliştirme sunucusu varsayılan olarak `http://localhost:3000` adresinde çalışır
- Backend API sunucusu varsayılan olarak `http://localhost:8000` adresinde çalışır
- Veritabanı işlemleri için SQLite veritabanı (`app.db`) kullanılmaktadır

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
