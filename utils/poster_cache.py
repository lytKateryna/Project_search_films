import json
import os
import tempfile
import threading
import time
import random

CACHE_FILE = os.path.join(os.path.dirname(__file__), "poster_cache.json")
_lock = threading.Lock()
_cache: dict = {}


def _load_cache() -> None:
    global _cache
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                _cache = json.load(f)
        except Exception:
            _cache = {}
    else:
        _cache = {}


_load_cache()


def get(title: str) -> str | None:
    if not title:
        return None
    return _cache.get(title)


def set(title: str, url: str) -> None:
    if not title:
        return
    with _lock:
        _cache[title] = url
        
        # Retry logic for Windows file locking issues
        max_retries = 3
        for attempt in range(max_retries):
            try:
                dirpath = os.path.dirname(CACHE_FILE)
                if not os.path.exists(dirpath):
                    os.makedirs(dirpath, exist_ok=True)
                
                # Use unique temp filename to avoid conflicts
                timestamp = int(time.time() * 1000)
                random_suffix = random.randint(1000, 9999)
                tmp_name = f"tmp_cache_{timestamp}_{random_suffix}"
                tmp_path = os.path.join(dirpath, tmp_name)
                
                with open(tmp_path, "w", encoding="utf-8") as f:
                    json.dump(_cache, f, ensure_ascii=False, indent=2)
                
                # Small delay to ensure file is written
                time.sleep(0.01)
                
                os.replace(tmp_path, CACHE_FILE)
                break  # Success, exit retry loop
                
            except Exception as e:
                if attempt == max_retries - 1:
                    print(f"Poster cache write error after {max_retries} attempts:", e)
                else:
                    # Brief wait before retry
                    time.sleep(0.05 * (attempt + 1))
