from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
import os
from datetime import datetime, timedelta
from openai import OpenAI
import hashlib
import jwt
from functools import wraps
import traceback
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()

app = Flask(__name__)
CORS(app)

# OpenAI API anahtarını environment variable'dan al
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY environment variable is not set")

# JWT için gizli anahtar
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is not set")

def get_db_connection():
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row
    return conn

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            token = token.split(' ')[1]  # Bearer token
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            return f(data['user_id'], *args, **kwargs)
        except Exception as e:
            print(f"Token error: {str(e)}")
            print(traceback.format_exc())
            return jsonify({'error': 'Invalid token'}), 401
    return decorated

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email ve şifre gereklidir'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Email kontrolü
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        if cursor.fetchone():
            return jsonify({'error': 'Bu email zaten kullanılıyor'}), 400

        # Kullanıcıyı kaydet
        cursor.execute('INSERT INTO users (email, password) VALUES (?, ?)',
                      (email, password))
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()

        # Token oluştur
        token = jwt.encode({
            'user_id': user_id,
            'exp': datetime.utcnow() + timedelta(days=1)
        }, SECRET_KEY, algorithm='HS256')

        return jsonify({
            'message': 'Kayıt başarılı',
            'token': token,
            'user_id': user_id
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email ve şifre gereklidir'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Kullanıcıyı bul
        cursor.execute('SELECT id, password FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        conn.close()

        if not user or user['password'] != password:
            return jsonify({'error': 'Geçersiz email veya şifre'}), 401

        # Token oluştur
        token = jwt.encode({
            'user_id': user['id'],
            'exp': datetime.utcnow() + timedelta(days=1)
        }, SECRET_KEY, algorithm='HS256')

        return jsonify({
            'message': 'Giriş başarılı',
            'token': token,
            'user_id': user['id']
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/roadmap', methods=['POST'])
@token_required
def create_roadmap(user_id):
    try:
        data = request.json
        print(f"Received data: {data}")
        goal = data.get('goal')
        duration = data.get('duration')

        if not all([goal, duration]):
            return jsonify({'error': 'Missing required fields'}), 400

        # OpenAI API'yi kullanarak yol haritası oluştur
        prompt = f"""
        {goal} hedefine ulaşmak için {duration} günlük detaylı bir öğrenme yol haritası oluştur.
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

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Sen bir eğitim danışmanısın. Detaylı ve pratik öğrenme yol haritaları oluşturuyorsun."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )

        # OpenAI'dan gelen yanıtı işle
        try:
            response_content = response.choices[0].message.content
            print(f"Raw OpenAI response: {response_content}")
            
            # JSON formatını düzelt
            response_content = response_content.replace("'", '"')  # Tek tırnakları çift tırnakla değiştir
            response_content = response_content.replace("True", "true")  # Python True'yu JSON true'ya çevir
            response_content = response_content.replace("False", "false")  # Python False'u JSON false'a çevir
            
            roadmap_data = json.loads(response_content)
            print(f"Parsed roadmap data: {roadmap_data}")
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {str(e)}")
            print(f"Raw response: {response_content}")
            return jsonify({'error': 'Yol haritası oluşturulurken bir hata oluştu'}), 500
        except Exception as e:
            print(f"Error processing OpenAI response: {str(e)}")
            return jsonify({'error': 'Yol haritası oluşturulurken bir hata oluştu'}), 500

        # Veritabanına kaydet
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            # Ana roadmap kaydı
            cursor.execute('''
                INSERT INTO roadmaps (user_id, title, description, duration)
                VALUES (?, ?, ?, ?)
            ''', (user_id, roadmap_data['title'], roadmap_data['description'], duration))
            
            roadmap_id = cursor.lastrowid
            print(f"Inserted roadmap with ID: {roadmap_id}")

            # Adımları kaydet
            for index, step in enumerate(roadmap_data['steps']):
                cursor.execute('''
                    INSERT INTO roadmap_steps (roadmap_id, day_number, topic, description, resources)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    roadmap_id,
                    index + 1,  # Gün numarası
                    step['title'],
                    step['description'],
                    json.dumps(step['resources'])
                ))
                print(f"Inserted step {index + 1} for roadmap {roadmap_id}")

            conn.commit()
            print("Database transaction committed successfully")

            # Kaydedilen roadmap'i getir
            cursor.execute('''
                SELECT r.*, 
                       GROUP_CONCAT(rs.day_number || '|' || rs.topic || '|' || rs.description || '|' || rs.resources) as steps
                FROM roadmaps r
                LEFT JOIN roadmap_steps rs ON r.id = rs.roadmap_id
                WHERE r.id = ?
                GROUP BY r.id
            ''', (roadmap_id,))

            saved_roadmap = cursor.fetchone()
            if saved_roadmap:
                steps = []
                if saved_roadmap['steps']:
                    for step in saved_roadmap['steps'].split(','):
                        day, topic, description, resources = step.split('|', 3)
                        steps.append({
                            'day': int(day),
                            'title': topic,
                            'description': description,
                            'resources': json.loads(resources)
                        })

                roadmap_response = {
                    'id': saved_roadmap['id'],
                    'title': saved_roadmap['title'],
                    'description': saved_roadmap['description'],
                    'duration': saved_roadmap['duration'],
                    'created_at': saved_roadmap['created_at'],
                    'steps': steps
                }

                return jsonify({
                    'message': 'Roadmap created successfully',
                    'roadmap': roadmap_response
                }), 201

        except Exception as db_error:
            conn.rollback()
            print(f"Database error: {str(db_error)}")
            raise db_error
        finally:
            conn.close()

    except Exception as e:
        print(f"Error in create_roadmap: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/roadmaps/<int:user_id>', methods=['GET'])
@token_required
def get_user_roadmaps(user_id, requested_user_id):
    if user_id != requested_user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Kullanıcının tüm yol haritalarını getir
        cursor.execute('''
            SELECT r.*, 
                   GROUP_CONCAT(rs.day_number || '|' || rs.topic || '|' || rs.description || '|' || rs.resources) as steps
            FROM roadmaps r
            LEFT JOIN roadmap_steps rs ON r.id = rs.roadmap_id
            WHERE r.user_id = ?
            GROUP BY r.id
        ''', (user_id,))

        roadmaps = []
        for row in cursor.fetchall():
            steps = []
            if row['steps']:
                for step in row['steps'].split(','):
                    day, topic, description, resources = step.split('|', 3)
                    steps.append({
                        'day': int(day),
                        'title': topic,
                        'description': description,
                        'resources': json.loads(resources)
                    })

            roadmaps.append({
                'id': row['id'],
                'title': row['title'],
                'description': row['description'],
                'duration': row['duration'],
                'created_at': row['created_at'],
                'steps': steps
            })

        conn.close()
        return jsonify(roadmaps)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/roadmap/stage/<int:roadmap_id>/<int:stage_id>', methods=['GET'])
@token_required
def get_stage_detail(user_id, roadmap_id, stage_id):
    try:
        print(f"\n=== Stage Detail Request ===")
        print(f"Roadmap ID: {roadmap_id}")
        print(f"Stage ID: {stage_id}")
        print(f"User ID: {user_id}")
        
        # Roadmap'i veritabanından al
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Önce roadmap'in var olup olmadığını kontrol et
        cursor.execute("""
            SELECT id, content FROM roadmaps 
            WHERE id = ? AND user_id = ?
        """, (roadmap_id, user_id))
        
        roadmap = cursor.fetchone()
        if not roadmap:
            print(f"Roadmap not found for ID: {roadmap_id} and user_id: {user_id}")
            return jsonify({'error': 'Roadmap not found'}), 404
        
        print(f"Found roadmap with ID: {roadmap['id']}")
        print(f"Roadmap content: {roadmap['content']}")
        
        # Content'i satırlara böl ve boş satırları filtrele
        content_lines = [line.strip() for line in roadmap['content'].split('\n') if line.strip()]
        print(f"Total stages found: {len(content_lines)}")
        print(f"Content lines: {content_lines}")
        
        # Stage ID'yi 1'den başlayan indekse çevir
        stage_index = stage_id - 1
        print(f"Requested stage ID: {stage_id}, converted to index: {stage_index}")
        
        # Geçerli indeks kontrolü
        if stage_index < 0 or stage_index >= len(content_lines):
            error_msg = f'Stage not found. Total stages: {len(content_lines)}, requested stage: {stage_id}'
            print(f"Error: {error_msg}")
            return jsonify({'error': error_msg}), 404
        
        # Aşama başlığını al
        stage_title = content_lines[stage_index]
        print(f"Found stage title: {stage_title}")
        
        # GPT API'ye gönderilecek prompt
        prompt = f"""
        Aşama: {stage_title}

Lütfen sadece bu aşama hakkında 3-4 cümlelik kısa ve sade bir açıklama yaz.  
Açıklama sade, anlaşılır ve bilgilendirici olmalı.  
Aktivite, kaynak, liste veya başka bir format kullanma.  
Sadece açıklama cümlelerinden oluşsun.  
Yalnızca Türkçe yaz.

        """
        
        print(f"Sending prompt to GPT API: {prompt}")
        
        # GPT API'ye istek at
        try:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Sen bir öğrenme yol haritası oluşturucususun. "
    "Kullanıcı sana bir aşama (stage_title) verecek. "
    "Senin görevin sadece bu aşamanın ne anlama geldiğini açıklayan 3-4 cümlelik basit ve kısa bir metin yazmaktır. "
    "Açıklaman sade, açık ve bilgilendirici olmalı. "
    "Aktivite, kaynak, liste ya da başka format kullanma. "
    "Sadece Türkçe açıklama yaz."},
                    {"role": "user", "content": prompt}
                ]
            )
            
            print(f"GPT API response received")
            
            # GPT yanıtını parse et
            try:
                content = response.choices[0].message.content
                print(f"GPT content: {content}")
                stage_data = json.loads(content)
                
                response_data = {
                    "title": stage_title,
                    "description": stage_data["description"],
                    "activities": stage_data["activities"]
                }
                print(f"Sending response: {response_data}")
                
                return jsonify(response_data)
            except json.JSONDecodeError as e:
                print(f"JSON parse error: {e}")
                return jsonify({'error': 'Error parsing GPT response'}), 500
                
        except Exception as e:
            print(f"GPT API error: {e}")
            return jsonify({'error': f'Error calling GPT API: {str(e)}'}), 500
            
    except Exception as e:
        print(f"Unexpected error: {e}")
        print(f"Error traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()
            print("Database connection closed")

if __name__ == '__main__':
    app.run(debug=True) 