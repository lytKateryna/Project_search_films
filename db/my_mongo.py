# Импортируем нужные библиотеки

from pymongo import MongoClient
from datetime import datetime, timezone
from settings import settings
print("MONGO_URL used:", settings.MONGO_URL)
print("MONGO_DB:", settings.MONGO_DB)
print("COLLECTION:", settings.MONGO_LOG_COLLECTION)
client = MongoClient(settings.MONGO_URL, serverSelectionTimeoutMS=5000)
db = client[settings.MONGO_DB]
collection = db[settings.MONGO_LOG_COLLECTION]


def ping():
    client.admin.command("ping")


def get_popular_queries(limit: int = 5):
    """Самые популярные (по количеству запросов) с подсчетом количества"""
    try:
        # Сначала пробуем новый формат с search_type и params
        pipeline = [
            {
                "$group": {
                    "_id": {
                        "$cond": {
                            "if": { "$eq": ["$search_type", "keyword"] },
                            "then": "$params.query",
                            "else": {
                                "$cond": {
                                    "if": { "$eq": ["$search_type", "genre"] },
                                    "then": { "$concat": ["genre:", { "$toString": "$params.category_id" }] },
                                    "else": {
                                        "$cond": {
                                            "if": { "$eq": ["$search_type", "year"] },
                                            "then": { "$toString": "$params.year" },
                                            "else": "unknown"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "count": { "$sum": 1 },
                    "latest_search": { "$max": "$timestamp" },
                    "search_type": { "$first": "$search_type" },
                    "params": { "$first": "$params" }
                }
            },
            {
                "$project": {
                    "query": "$_id",
                    "count": 1,
                    "latest_search": 1,
                    "search_type": 1,
                    "params": 1,
                    "_id": 0
                }
            },
            { "$sort": { "count": -1, "latest_search": -1 } },
            { "$limit": limit }
        ]
        
        cursor = collection.aggregate(pipeline)
        result = list(cursor)
        
        # Если результатов нет в новом формате, пробуем старый формат
        if len(result) == 0:
            pipeline = [
                {
                    "$group": {
                        "_id": "$query",
                        "count": { "$sum": 1 },
                        "latest_search": { "$max": "$timestamp" },
                        "year_from": { "$first": "$year_from" },
                        "year_to": { "$first": "$year_to" },
                        "genres": { "$first": "$genres" }
                    }
                },
                { "$sort": { "count": -1, "latest_search": -1 } },
                { "$limit": limit }
            ]
            
            for doc in collection.aggregate(pipeline):
                if doc["_id"]:  # Убедимся, что query не пустой
                    clean_doc = {
                        "_id": str(doc["_id"]),  # Используем query как _id для совместимости
                        "query": doc["_id"],
                        "count": doc["count"],
                        "year_from": doc["year_from"],
                        "year_to": doc["year_to"],
                        "genres": doc["genres"] if doc["genres"] else []
                    }
                    
                    # Обрабатываем timestamp
                    if doc["latest_search"]:
                        if hasattr(doc["latest_search"], 'isoformat'):
                            clean_doc["timestamp"] = doc["latest_search"].isoformat()
                        elif isinstance(doc["latest_search"], str):
                            clean_doc["timestamp"] = doc["latest_search"]
                        else:
                            clean_doc["timestamp"] = str(doc["latest_search"])
                    else:
                        clean_doc["timestamp"] = datetime.now(timezone.utc).isoformat()
                    
                    result.append(clean_doc)
        
        return result
    except Exception as error:
        print(f"Error reading popular queries: {error}")
        return []


def get_recent_queries(limit: int = 5):
    """уникальные запросы"""
    try:
        # Сначала пробуем новый формат (search_type, params) с группировкой для уникальности
        pipeline = [
            {
                "$group": {
                    "_id": {
                        "$cond": {
                            "if": { "$eq": ["$search_type", "keyword"] },
                            "then": "$params.query",
                            "else": {
                                "$cond": {
                                    "if": { "$eq": ["$search_type", "genre"] },
                                    "then": { "$concat": ["genre:", { "$toString": "$params.category_id" }] },
                                    "else": {
                                        "$cond": {
                                            "if": { "$eq": ["$search_type", "year"] },
                                            "then": { "$toString": "$params.year" },
                                            "else": "unknown"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "latest_timestamp": { "$max": "$timestamp" },
                    "search_type": { "$first": "$search_type" },
                    "params": { "$first": "$params" },
                    "_original_id": { "$first": "$_id" }
                }
            },
            { "$sort": { "latest_timestamp": -1 } },
            { "$limit": limit }
        ]
        
        cursor = collection.aggregate(pipeline)
        result = []
        
        for doc in cursor:
            clean_doc = {
                "_id": str(doc["_original_id"])
            }
            
            # Обрабатываем новый формат
            if "search_type" in doc and "params" in doc:
                clean_doc["search_type"] = doc["search_type"]
                clean_doc["params"] = doc["params"]
                
                # Для совместимости добавляем поле query
                if doc["search_type"] == "keyword" and "query" in doc["params"]:
                    clean_doc["query"] = doc["params"]["query"]
                elif doc["search_type"] == "genre" and "category_id" in doc["params"]:
                    clean_doc["query"] = f"genre:{doc['params']['category_id']}"
                elif doc["search_type"] == "year" and "year" in doc["params"]:
                    clean_doc["query"] = str(doc["params"]["year"])
                else:
                    clean_doc["query"] = "unknown"
            
            # Обрабатываем timestamp
            if "latest_timestamp" in doc:
                if hasattr(doc["latest_timestamp"], 'isoformat'):
                    clean_doc["timestamp"] = doc["latest_timestamp"].isoformat()
                elif isinstance(doc["latest_timestamp"], str):
                    clean_doc["timestamp"] = doc["latest_timestamp"]
                else:
                    clean_doc["timestamp"] = str(doc["latest_timestamp"])
            else:
                clean_doc["timestamp"] = datetime.now(timezone.utc).isoformat()
            
            result.append(clean_doc)
        
        # Если результатов нет в новом формате, пробуем старый формат с группировкой для уникальности
        if len(result) == 0:
            pipeline = [
                {
                    "$group": {
                        "_id": "$query",
                        "latest_timestamp": { "$max": { "$ifNull": ["$timestamp", "$last_searched"] } },
                        "year_from": { "$first": "$year_from" },
                        "year_to": { "$first": "$year_to" },
                        "genres": { "$first": "$genres" },
                        "_original_id": { "$first": "$_id" }
                    }
                },
                { "$match": { "_id": { "$ne": None, "$ne": "" } } },
                { "$sort": { "latest_timestamp": -1 } },
                { "$limit": limit }
            ]
            
            for doc in collection.aggregate(pipeline):
                clean_doc = {
                    "_id": str(doc["_original_id"]),
                    "query": doc["_id"],
                    "year_from": doc["year_from"],
                    "year_to": doc["year_to"],
                    "genres": doc["genres"] if doc["genres"] else []
                }
                
                # Обрабатываем timestamp
                if "latest_timestamp" in doc:
                    if hasattr(doc["latest_timestamp"], 'isoformat'):
                        clean_doc["timestamp"] = doc["latest_timestamp"].isoformat()
                    elif isinstance(doc["latest_timestamp"], str):
                        clean_doc["timestamp"] = doc["latest_timestamp"]
                    else:
                        clean_doc["timestamp"] = str(doc["latest_timestamp"])
                else:
                    clean_doc["timestamp"] = datetime.now(timezone.utc).isoformat()
                
                result.append(clean_doc)
        
        return result
    except Exception as e:
        print(f"Error reading recent queries: {e}")
        return []


if __name__ == "__main__":
    print("Checking connection...")
    try:
        test_query = {
            "query": "test_query",
            "year_from": 2020,
            "year_to": 2023,
            "genres": ["action", "drama"],
            "timestamp": datetime.now(timezone.utc)
        }


        popular = get_popular_queries(5)
        recent = get_recent_queries(5)

        print(f"TOP Popular (by count): {popular}")
        print(f"TOP Recent (by time): {recent}")
    except Exception as err:
        print(f"Error during testing: {err}")
