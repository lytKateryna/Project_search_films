from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI #Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from routes.films import router as films_router
from routes.pages import router as pages_router
from routes.meta import router as meta_router
from db.my_sql import create_search_indexes

# Создаем индексы для ускорения поиска
print("Creating database indexes...")
create_search_indexes()


class CharsetMiddleware(BaseHTTPMiddleware):
    """Middleware для установки правильной кодировки UTF-8 для статических файлов"""
    
    async def dispatch(self, request: Request, call_next):
        """Обрабатывает запрос и добавляет кодировку UTF-8 для CSS и JS файлов"""
        response = await call_next(request)
        # Добавляем правильную кодировку для CSS и JS файлов
        if request.url.path.endswith(('.css', '.js')):
            response.headers["Content-Type"] = response.headers.get(
                "Content-Type", 
                "text/css" if request.url.path.endswith('.css') else "application/javascript"
            ) + "; charset=utf-8"
        return response


app = FastAPI(title="Movie Finder API", version="0.1.0")

# Добавляем middleware для кодировки
# app.add_middleware(CharsetMiddleware)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pages_router)
app.include_router(films_router)
app.include_router(meta_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8002)


