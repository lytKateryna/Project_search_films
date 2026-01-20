from fastapi import APIRouter, Query, HTTPException
from db.my_sql import (
    get_films as db_get_films,
    get_films_count,
    search_films_by_keyword as db_search_films_by_keyword,
    count_films_by_keyword,
    search_films_by_actor as db_search_films_by_actor,
    count_films_by_actor,
    get_title_year_genres as db_get_title_year_genres,
    count_films_by_genres_year_range,
    get_films_by_year as db_get_films_by_year,
    get_films_by_year_range as db_get_films_by_year_range,
    count_films_by_year,
    count_films_by_year_range,
    get_all_genres as db_get_all_genres,
    get_years,
    get_new_films,
    get_new_films_count,
    get_popular_films,
    get_popular_films_count,
    get_top_rated_films,
    get_top_rated_films_count,
    get_random_films
)
from utils.log_writer import log_search_keyword, log_films_id
from utils.pagination import paginate
from utils.tmdb import get_poster_by_title
from schemas import GenreListResponse, Genre



router = APIRouter(prefix='/films', tags=['films'])


# -----------------------------
# Вспомогательная функция для добавления постеров
# -----------------------------

def add_posters(films: list[dict]) -> list[dict]:
    """Добавляет URL постеров к списку фильмов"""
    for film in films:
        try:
            poster_url = get_poster_by_title(film.get("title", ""))
            film["poster_url"] = poster_url if poster_url else "/static/images/no-poster.svg"
        except Exception as e:
            print(f"Error getting poster for {film.get('title', 'unknown')}: {e}")
            film["poster_url"] = "/static/images/no-poster.svg"
    return films


def add_posters_safe(films: list[dict]) -> list[dict]:
    """Безопасно добавляет постеры, не давая сбоям предотвратить показ фильмов"""
    try:
        return add_posters(films)
    except Exception as e:
        print(f"Error adding posters: {e}")
        # Ensure all films have at least a default poster
        for film in films:
            film["poster_url"] = "/static/images/no-poster.svg"
        return films


def get_films_with_posters(fetch_items, fetch_total, limit: int, offset: int, **kwargs):
    """Универсальная функция для получения фильмов с постерами"""
    result = paginate(
        fetch_items=fetch_items,
        fetch_total=fetch_total,
        limit=limit,
        offset=offset,
        **kwargs
    )
    result["items"] = add_posters_safe(result["items"])
    return result


# -----------------------------
# Маршруты
# -----------------------------
@router.get('/latest')
def get_latest_films_route(offset: int = Query(0, ge=0), limit: int = Query(10, ge=1, le=50)):
    """Получает последние добавленные фильмы с пагинацией"""
    result = paginate(
        fetch_items=db_get_films,
        fetch_total=get_films_count,
        limit=limit,
        offset=offset
    )
    result["items"] = add_posters(result["items"])
    return result


@router.get('/search/keyword')
def search_films_by_keyword_route(query: str, offset: int = Query(0, ge=0), limit: int = Query(10, ge=1, le=1000)):
    """Поиск фильмов по ключевому слову в названии"""
    try:
        result = paginate(
            fetch_items=db_search_films_by_keyword,
            fetch_total=count_films_by_keyword,
            keyword=query,
            limit=limit,
            offset=offset
        )
        result["query"] = query
        
        try:
            log_search_keyword(search_type='keyword', params={"query": query})
            log_films_id([item["film_id"] for item in result["items"] if "film_id" in item])
        except Exception as e:
            print("Logging failed:", e)
        # Логирование уже выполняется выше через log_search_keyword
        return result
    except Exception as e:
        print(f"Database error in search_films_by_keyword: {e}")
        # Return empty result instead of 500 error
        return {
            "query": query,
            "items": [],
            "offset": offset,
            "limit": limit,
            "total": 0,
            "count": 0
        }


@router.get('/search/actor')
def search_films_by_actor(full_name: str, offset: int = Query(0, ge=0), limit: int = Query(10, ge=1, le=50)):
    """Поиск фильмов по имени актера"""
    result = paginate(
        fetch_items=db_search_films_by_actor,
        fetch_total=count_films_by_actor,
        full_name=full_name,
        limit=limit,
        offset=offset
    )
    result["full_name"] = full_name
    # result["items"] = add_posters(result["items"])  # Commented out to speed up response
    return result


@router.get('/search/genres')
def get_title_year_genres_route(category_id: int, year_from: int, year_to: int, offset: int = Query(0, ge=0),
                                limit: int = Query(10, ge=1, le=50)):
    """Получает фильмы по жанру и диапазону лет"""
    result = paginate(
        fetch_items=db_get_title_year_genres,
        fetch_total=count_films_by_genres_year_range,
        category_id=category_id,
        year_from=year_from,
        year_to=year_to,
        limit=limit,
        offset=offset
    )
    result["category_id"] = category_id
    result["year_from"] = year_from
    result["year_to"] = year_to
    result["items"] = add_posters(result["items"])  # Commented out to speed up response
    # Get genre name for logging
    genres = db_get_all_genres()
    genre_name = next((g.get('name', '') for g in genres if g.get('category_id') == category_id), f"genre_{category_id}")
    
    try:
        log_search_keyword(search_type='genre', params={
            "category_id": category_id,
            "genre_name": genre_name,
            "year_from": year_from,
            "year_to": year_to
        })
        log_films_id([item["film_id"] for item in result["items"] if "film_id" in item])
    except Exception as e:
        print("Logging failed:", e)
    
    return result


@router.get('/genres', response_model=GenreListResponse)
def get_all_genres_route():
    """Получает список всех жанров"""
    try:
        items = db_get_all_genres()
        genre_items = [Genre(**item) for item in items]
        return GenreListResponse(items=genre_items, count=len(genre_items))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/min_max_year/keyword')
def get_min_max_year_route():
    """Получает минимальный и максимальный год в базе данных"""
    items = get_years()
    return items


@router.get('/search/year_range')
def search_films_by_year_range_route(year_from: int, year_to: int, category_id: int = Query(None), offset: int = Query(0, ge=0),
                                     limit: int = Query(10, ge=1, le=50)):
    """Поиск фильмов по диапазону лет с опциональным фильтром жанра"""
    result = paginate(
        fetch_items=db_get_films_by_year_range,
        fetch_total=count_films_by_year_range,
        year_from=year_from,
        year_to=year_to,
        category_id=category_id,
        limit=limit,
        offset=offset
    )
    result["year_from"] = year_from
    result["year_to"] = year_to
    result["category_id"] = category_id
    # result["items"] = add_posters(result["items"])  # Commented out to speed up response
    return result


@router.get('/search/year')
def search_films_by_year_route(year: int, offset: int = Query(0, ge=0), limit: int = Query(10, ge=1, le=50)):
    """Поиск фильмов по конкретному году"""
    print(f"/films/search/year called with year={year} offset={offset} limit={limit}")
    error_msg = None
    try:
        result = paginate(
            fetch_items=db_get_films_by_year,
            fetch_total=count_films_by_year,
            year=year,
            limit=limit,
            offset=offset
        )
        result["year"] = year

        
        try:
            log_search_keyword(search_type='year', params={"year": year})
            log_films_id([item["film_id"] for item in result["items"] if "film_id" in item])
        except Exception as e:
            print("Logging failed:", e)
    except Exception as e:
        print("DB error in get_films_by_year:", e)
        error_msg = "database_error"
        result = {
            "year": year,
            "items": [],
            "offset": offset,
            "limit": limit,
            "total": 0,
            "count": 0
        }

    if error_msg:
        result["error"] = error_msg

    return result


@router.get('/search/new')
def get_new_films_route(offset: int = Query(0, ge=0), limit: int = Query(10, ge=1, le=50)):
    """Получает новинки фильмов с пагинацией"""
    return get_films_with_posters(get_new_films, get_new_films_count, limit, offset)


@router.get('/search/popular')
def get_popular_films_route(offset: int = Query(0, ge=0), limit: int = Query(10, ge=1, le=50)):
    """Получает популярные фильмы с пагинацией"""
    return get_films_with_posters(get_popular_films, get_popular_films_count, limit, offset)


@router.get('/search/top-rated')
def get_top_rated_films_route(offset: int = Query(0, ge=0), limit: int = Query(10, ge=1, le=50)):
    """Получает фильмы с высоким рейтингом с пагинацией"""
    return get_films_with_posters(get_top_rated_films, get_top_rated_films_count, limit, offset)


@router.get('/search/random')
def get_random_films_route(limit: int = Query(10, ge=1, le=50)):
    """Получает случайные фильмы"""
    try:
        films = get_random_films(limit=limit)
        films = add_posters_safe(films)
        return {
            "items": films,
            "total": len(films),
            "offset": 0,
            "limit": limit,
            "count": len(films)
        }
    except Exception as e:
        print(f"Error in get_random_films_route: {e}")
        films = get_random_films(limit=limit)
        films = add_posters_safe(films)
        return {
            "items": films,
            "total": len(films),
            "offset": 0,
            "limit": limit,
            "count": len(films)
        }


