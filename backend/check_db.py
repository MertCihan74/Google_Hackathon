import sqlite3

def check_tables():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # Tüm tabloları listele
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print("Veritabanındaki tablolar:")
    for table in tables:
        print(f"- {table[0]}")
        
        # Tablo yapısını göster
        cursor.execute(f"PRAGMA table_info({table[0]});")
        columns = cursor.fetchall()
        print("  Sütunlar:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
        print()
    
    conn.close()

if __name__ == '__main__':
    check_tables() 