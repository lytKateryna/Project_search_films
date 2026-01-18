from fastapi import APIRouter, Query, Body
from pydantic import BaseModel
from typing import Optional, List
from utils.log_writer import log_search_keyword
from db.my_mongo import (
    get_popular_queries,
    get_recent_queries
)
from db.my_sql import get_years

# Роутер для мета-информации (поисковые запросы)
router = APIRouter(prefix="/meta", tags=["meta"])


def handle_endpoint_error(endpoint_name: str, error: Exception):
    """Обработчик ошибок для эндпоинтов"""
    print(f"Error in {endpoint_name} endpoint: {error}")
    import traceback
    traceback.print_exc()
    raise


def log_and_return(result: dict, endpoint_name: str = ""):
    """Логирует и возвращает результат"""
    print(f"Returning result: {result}")
    return result


class SearchQuery(BaseModel):
    query: str
    year_from: Optional[int] = None
    year_to: Optional[int] = None
    genres: Optional[List[str]] = []
    timestamp: Optional[str] = None


@router.post("/search")
def save_search(search_query: SearchQuery = Body(...)):
    """
    Сохранить поисковый запрос в MongoDB
    """
    try:
        print(f"Received search query: {search_query}")
        # Используем новый подход к логированию
        log_search_keyword(search_type='manual', params=search_query.model_dump())
        print("Successfully saved to MongoDB")
        result = {
            "status": "ok",
            "query": search_query.model_dump()
        }
        return log_and_return(result, "save_search")
    except Exception as e:
        handle_endpoint_error("save_search", e)


@router.get("/popular")
def popular_queries(limit: int = Query(5, ge=1, le=20)):
    """
    Получить самые популярные поисковые запросы
    """
    items = get_popular_queries(limit)
    return {
        "items": items,
        "count": len(items)
    }


@router.get("/recent")
def recent_queries(limit: int = Query(5, ge=1, le=20)):
    """
    Получить последние поисковые запросы
    """
    try:
        print(f"Received request for recent queries with limit: {limit}")
        items = get_recent_queries(limit)
        print(f"Successfully retrieved {len(items)} items")
        result = {
            "items": items,
            "count": len(items)
        }
        return log_and_return(result, "recent_queries")
    except Exception as e:
        handle_endpoint_error("recent_queries", e)


@router.get("/year-range")
def year_range():
    """
    Получить минимальный и максимальный год из базы данных
    """
    try:
        print("Received request for year range")
        years = get_years()
        print(f"Successfully retrieved year range: {years}")
        
        if years and len(years) > 0:
            result = {
                "min_year": years[0]["min_year"],
                "max_year": years[0]["max_year"]
            }
        else:
            # Fallback значения если база пуста
            result = {
                "min_year": 1900,
                "max_year": 2025
            }
        
        return log_and_return(result, "year_range")
    except Exception as e:
        handle_endpoint_error("year_range", e)
        # Fallback значения в случае ошибки
        return {
            "min_year": 1900,
            "max_year": 2025
        }

