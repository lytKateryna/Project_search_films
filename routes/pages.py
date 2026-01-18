from fastapi import APIRouter, Request, HTTPException
from utils.templates import templates
from db.my_sql import get_film_by_id

router = APIRouter(tags=["pages"])

@router.get("/")
def index_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@router.get("/movie/{film_id}")
def movie_detail_page(request: Request, film_id: int):
    try:
        film = get_film_by_id(film_id)
        if not film:
            raise HTTPException(status_code=404, detail="Film not found")
        return templates.TemplateResponse("movie_detail.html", {"request": request, "film": film})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/unique")
def unique_page(request: Request):
    return templates.TemplateResponse("unique.html", {"request": request})


@router.get("/health")
def health():
    return {"status": "ok"}

@router.get("/.well-known/appspecific/com.chrome.devtools.json")
def chrome_devtools():
    return {}
