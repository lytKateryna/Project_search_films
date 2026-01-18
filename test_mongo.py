# Тестовый скрипт для проверки MongoDB
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.my_mongo import save_search_query, get_recent_queries

def test_mongo_operations():
    print("=== Тестирование операций MongoDB ===")
    
    # Тестовые данные
    test_queries = [
        {
            "query": "matrix",
            "year_from": 1999,
            "year_to": 2003,
            "genres": ["action", "sci-fi"]
        },
        {
            "query": "avatar",
            "year_from": 2009,
            "year_to": 2009,
            "genres": ["action", "adventure"]
        },
        {
            "query": "batman",
            "year_from": 2022,
            "year_to": 2022,
            "genres": ["action"]
        }
    ]
    
    # Сохраняем тестовые запросы
    print("Сохранение тестовых запросов...")
    for i, query in enumerate(test_queries):
        try:
            save_search_query(query)
            print(f"✅ Запрос {i+1} сохранен: {query['query']}")
        except Exception as e:
            print(f"❌ Ошибка сохранения запроса {i+1}: {e}")
    
    # Получаем последние запросы
    print("\nПолучение последних запросов...")
    try:
        recent = get_recent_queries(5)
        print(f"✅ Получено {len(recent)} последних запросов:")
        for i, query in enumerate(recent):
            print(f"  {i+1}. {query.get('query', 'N/A')} - {query.get('timestamp', 'N/A')}")
    except Exception as e:
        print(f"❌ Ошибка получения последних запросов: {e}")
    
    print("\n=== Тест завершен ===")

if __name__ == "__main__":
    test_mongo_operations()
