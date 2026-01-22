from datetime import datetime, timezone
from pymongo import MongoClient
from pymongo.collection import Collection
from settings import settings

# Ленивая инициализация позволяет избежать блокировки запуска приложения при недоступности MongoDB
_client: MongoClient | None = None
_collection: Collection | None = None
_stats: Collection | None = None

def _init_mongo():
    """Инициализация подключения к MongoDB с отложенной загрузкой"""
    global _client, _collection, _stats
    if _client is not None:
        return
    try:
        _client = MongoClient(settings.MONGO_URL, serverSelectionTimeoutMS=500)
        db = _client[settings.MONGO_DB]
        _collection = db[settings.MONGO_LOG_COLLECTION]
        _stats = db[settings.MONGO_LOG_STATS]
    except Exception as e:
        # Don't raise on import/startup — logging should be best-effort
        print("Mongo init error:", e)


def log_search_keyword(search_type: str, params: dict):
    """Логирует поисковые запросы в MongoDB"""
    _init_mongo()
    if _collection is None:
        return
    try:
        _collection.insert_one({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "search_type": search_type,
            "params": params,
        })
    except Exception as e:
        print("Mongo log_search_keyword error:", e)



def log_films_id(ids: list[int]) -> None:
    """Логирует статистику просмотров фильмов"""
    _init_mongo()
    if _stats is None:
        return
    now = datetime.now(timezone.utc).astimezone().isoformat()

    for film_id in ids:
        try:
            _stats.update_one(
                {"film_id": film_id},
                {
                    "$inc": {"search_impressions": 1},
                    "$set": {"last_seen_at": now},
                },
                upsert=True,
            )
        except Exception as e:
            print(e)