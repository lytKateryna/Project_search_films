import requests
from settings import settings
from .poster_cache import get as get_cached_poster, set as set_cached_poster

TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/multi"
POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500"

TMDB_API_KEY = settings.TMDB_API_KEY


def get_poster_by_title(title: str) -> str:
    if not title:
        return "/static/images/no-poster.svg"

    # Check disk cache first
    cached = get_cached_poster(title)
    if cached:
        return cached

    params = {
        "api_key": TMDB_API_KEY,
        "query": title,
        "language": "en-US",
    }

    try:
        response = requests.get(TMDB_SEARCH_URL, params=params, timeout=2)
        data = response.json()

        results = data.get("results", [])
        # берём первый movie или tv
        for item in results:
            if item.get("media_type") in ("movie", "tv"):
                poster_path = item.get("poster_path")
                if poster_path:
                    url = f"{POSTER_BASE_URL}{poster_path}"
                    set_cached_poster(title, url)
                    return url
    except Exception as e:
        print("TMDB fetch error:", e)

    # Cache negative result to avoid repeated failing requests
    set_cached_poster(title, "/static/images/no-poster.svg")
    return "/static/images/no-poster.svg"