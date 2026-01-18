import mysql.connector
from settings import settings


dbconfig = {
    'host': settings.MYSQL_HOST,
    'user': settings.MYSQL_USER,
    'password': settings.MYSQL_PASSWORD,
    'database': settings.MYSQL_DB,
}

_cfg = dbconfig.copy()

def create_search_indexes():
    """Создать индексы для ускорения поиска"""
    with mysql.connector.connect(**_cfg) as conn:
        with conn.cursor() as cursor:
            try:
                # Индекс для поиска по названию
                try:
                    cursor.execute("CREATE INDEX idx_film_title ON film(title)")
                    print("Created index idx_film_title")
                except mysql.connector.Error as err:
                    if err.errno == 1068:  # Duplicate key name
                        print("Index idx_film_title already exists")
                    else:
                        raise err
                
                # Составной индекс для сортировки
                try:
                    cursor.execute("CREATE INDEX idx_film_release_year_id ON film(release_year DESC, film_id DESC)")
                    print("Created index idx_film_release_year_id")
                except mysql.connector.Error as err:
                    if err.errno == 1068:  # Duplicate key name
                        print("Index idx_film_release_year_id already exists")
                    else:
                        raise err
                
                # Индексы для JOIN операций в поиске по ключевым словам
                try:
                    cursor.execute("CREATE INDEX idx_film_category_film_id ON film_category(film_id)")
                    print("Created index idx_film_category_film_id")
                except mysql.connector.Error as err:
                    if err.errno == 1068:  # Duplicate key name
                        print("Index idx_film_category_film_id already exists")
                    else:
                        raise err
                
                try:
                    cursor.execute("CREATE INDEX idx_film_category_category_id ON film_category(category_id)")
                    print("Created index idx_film_category_category_id")
                except mysql.connector.Error as err:
                    if err.errno == 1068:  # Duplicate key name
                        print("Index idx_film_category_category_id already exists")
                    else:
                        raise err
                
                conn.commit()
                print("Indexes created successfully")
            except Exception as e:
                print(f"Error creating indexes: {e}")
                conn.rollback()

def query_all(sql: str, params: tuple=())->list[dict]:
    """Выполняет SQL запрос и возвращает результат в виде списка словарей"""
    with mysql.connector.connect(**_cfg) as conn:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(sql, params)
            return cursor.fetchall()


def get_films(limit: int = 10, offset:int = 0)->list[dict]:
    """Получает список фильмов с пагинацией"""
    sql = """
        SELECT f.film_id, f.title, f.release_year, f.length, f.rating, '/static/images/no-poster.svg' AS poster_url,
               GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') AS genres
        FROM film f
        LEFT JOIN film_category fc ON f.film_id = fc.film_id
        LEFT JOIN category c ON fc.category_id = c.category_id
        GROUP BY f.film_id, f.title, f.release_year, f.length, f.rating
        ORDER BY f.release_year DESC, f.film_id DESC
        LIMIT %s OFFSET %s;
    """
    return query_all(sql,(limit, offset))


def get_films_count() -> int:
    """Получает общее количество фильмов"""
    sql = "SELECT COUNT(*) AS total FROM film;"
    row = query_all(sql)
    return row[0]["total"] if row else 0


def get_film_by_id(film_id: int) -> dict:
    """Получает информацию о фильме по ID"""
    sql = """
        SELECT f.film_id, f.title, f.release_year, f.length, f.rating, f.description,
               '/static/images/no-poster.svg' AS poster_url
        FROM film f
        WHERE f.film_id = %s;
    """
    result = query_all(sql, (film_id,))
    return result[0] if result else None


def search_films_by_keyword(keyword:str, limit: int = 10, offset:int = 0)->list[dict]:
    """Поиск фильмов по ключевому слову в названии"""
    # Поиск по всем жанрам с JOIN для получения информации о жанрах
    sql = """
      SELECT f.film_id, f.title, f.release_year, f.length, f.rating, '/static/images/no-poster.svg' AS poster_url,
             GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') AS genres
      FROM film f
      LEFT JOIN film_category fc ON f.film_id = fc.film_id
      LEFT JOIN category c ON fc.category_id = c.category_id
      WHERE f.title LIKE %s
      GROUP BY f.film_id, f.title, f.release_year, f.length, f.rating
      ORDER BY f.release_year DESC, f.film_id DESC
      LIMIT %s OFFSET %s;
    """
    # Используем паттерн поиска для любого места в названии
    search_pattern = f"%{keyword.strip().lower()}%"
    return query_all(sql, (search_pattern, limit, offset))


def count_films_by_keyword(keyword: str) -> int:
    """Подсчитывает количество фильмов по ключевому слову"""
    sql = """
        SELECT COUNT(DISTINCT f.film_id) AS total
        FROM film f
        LEFT JOIN film_category fc ON f.film_id = fc.film_id
        LEFT JOIN category c ON fc.category_id = c.category_id
        WHERE f.title LIKE %s;
    """
    search_pattern = f"%{keyword.strip().lower()}%"
    row = query_all(sql, (search_pattern,))
    return row[0]["total"] if row else 0


def count_films_by_actor(full_name: str, **kwargs) -> int:
    """Подсчитывает количество фильмов по имени актера"""
    sql = """
        SELECT COUNT(*) AS total
        FROM film AS f
        JOIN film_actor AS fa ON fa.film_id = f.film_id
        JOIN actor AS a ON a.actor_id = fa.actor_id
        WHERE CONCAT(a.first_name, ' ', a.last_name) LIKE %s;
    """
    row = query_all(sql, (f"%{full_name}%",))
    return row[0]["total"] if row else 0


def count_films_by_genres_year_range(category_id: int, year_from: int, year_to: int) -> int:
    """Подсчитывает количество фильмов по жанру и диапазону лет"""
    sql = """
        SELECT COUNT(*) AS total
        FROM film AS f
        JOIN film_category AS fc ON fc.film_id = f.film_id
        WHERE fc.category_id = %s AND f.release_year BETWEEN %s AND %s;
    """
    row = query_all(sql, (category_id, year_from, year_to))
    return row[0]["total"] if row else 0


def count_films_by_year(year: int) -> int:
    """Подсчитывает количество фильмов за конкретный год"""
    sql = """
        SELECT COUNT(*) AS total
        FROM film
        WHERE release_year = %s;
    """
    row = query_all(sql, (year,))
    return row[0]["total"] if row else 0


def count_films_by_year_range(year_from: int, year_to: int, category_id: int | None = None) -> int:
    """Подсчитывает количество фильмов в диапазоне лет с опциональным фильтром жанра"""
    if category_id is not None:
        sql = """
            SELECT COUNT(*) AS total
            FROM film AS f
            JOIN film_category AS fc ON fc.film_id = f.film_id
            WHERE f.release_year BETWEEN %s AND %s AND fc.category_id = %s;
        """
        row = query_all(sql, (year_from, year_to, category_id))
    else:
        sql = """
            SELECT COUNT(*) AS total
            FROM film
            WHERE release_year BETWEEN %s AND %s;
        """
        row = query_all(sql, (year_from, year_to))
    return row[0]["total"] if row else 0


def get_films_by_year_range(
    year_from: int,
    year_to: int,
    category_id: int | None = None,
    limit: int = 10,
    offset: int = 0
) -> list[dict]:
    """Получает фильмы в диапазоне лет с опциональным фильтром жанра"""

    if category_id is not None:
        sql = """
            SELECT f.film_id, f.title, f.release_year, f.length, f.rating,
                   '/static/images/no-poster.svg' AS poster_url
            FROM film AS f
            JOIN film_category AS fc ON fc.film_id = f.film_id
            WHERE f.release_year BETWEEN %s AND %s
              AND fc.category_id = %s
            ORDER BY f.release_year DESC, f.film_id DESC
            LIMIT %s OFFSET %s;
        """
        return query_all(sql, (year_from, year_to, category_id, limit, offset))


    sql = """
        SELECT film_id, title, release_year, length, rating,
               '/static/images/no-poster.svg' AS poster_url
        FROM film
        WHERE release_year BETWEEN %s AND %s
        ORDER BY release_year DESC, film_id DESC
        LIMIT %s OFFSET %s;
    """
    return query_all(sql, (year_from, year_to, limit, offset))


def get_all_genres()->list[dict]:
    """Получает список всех жанров"""
    sql = """
          SELECT category_id, name, '/static/images/no-poster.svg' AS poster_url 
          FROM category
          ORDER BY name;
          """
    return query_all(sql)


def get_years()->list[dict]:
    """Получает минимальный и максимальный год выпуска фильмов"""
    sql = """
    SELECT MIN(release_year) AS min_year,
    MAX(release_year) AS max_year
    FROM film;
     """
    return query_all(sql)


def search_films_by_year(year: int, offset: int = 0, limit: int = 10) -> list[dict]:
    """Поиск фильмов по конкретному году"""
    sql = """
        SELECT film_id, title, release_year, rating, length
        FROM film
        WHERE release_year = %s
        ORDER BY rating DESC
        LIMIT %s OFFSET %s
    """
    return query_all(sql, params=(year, limit, offset))

def get_title_year_genres(category_id:int, year_from:int, year_to:int,limit:int = 10, offset:int = 0)->list[dict]:
    """Получает фильмы по жанру и диапазону лет"""
    sql = """
          SELECT f.film_id, f.title, f.release_year, f.length, f.rating, c.name as genre, '/static/images/no-poster.svg' AS poster_url
          FROM film as f
          JOIN film_category as fc
          on fc.film_id = f.film_id
          JOIN category as c
          on c.category_id = fc.category_id
          WHERE fc.category_id = %s
          AND f.release_year BETWEEN %s AND %s
          ORDER BY f.release_year DESC, f.film_id DESC
          LIMIT %s OFFSET %s;
          """
    return query_all(sql,(category_id, year_from, year_to, limit, offset))


def get_films_by_year(year: int, limit: int = 10, offset: int = 0) -> list[dict]:
    """Получает фильмы за конкретный год"""
    sql = """
        SELECT film_id, title, release_year, length, rating, '/static/images/no-poster.svg' AS poster_url
        FROM film
        WHERE release_year = %s
        ORDER BY release_year DESC, film_id DESC
        LIMIT %s OFFSET %s;
    """
    return query_all(sql, (year, limit, offset))


def get_new_films(limit: int = 10, offset: int = 0) -> list[dict]:
    """Получает новинки фильмов (за последние 5 лет)"""
    # Define "new" as films from the last 5 years
    current_year = 2025  # Could be dynamic, but using fixed year for consistency
    min_year = current_year - 5  # Films from 2020 onwards
    
    sql = """
        SELECT f.film_id, f.title, f.release_year, f.length, f.rating, '/static/images/no-poster.svg' AS poster_url,
               GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') AS genres
        FROM film f
        LEFT JOIN film_category fc ON f.film_id = fc.film_id
        LEFT JOIN category c ON fc.category_id = c.category_id
        WHERE f.release_year >= %s
        GROUP BY f.film_id, f.title, f.release_year, f.length, f.rating
        ORDER BY f.release_year DESC, f.film_id DESC
        LIMIT %s OFFSET %s;
    """
    return query_all(sql, (min_year, limit, offset))


def get_new_films_count() -> int:
    """Получает количество новинок фильмов (за последние 5 лет)"""
    # Define "new" as films from the last 5 years
    current_year = 2025  # Could be dynamic, but using fixed year for consistency
    min_year = current_year - 5  # Films from 2020 onwards
    
    sql = "SELECT COUNT(*) AS total FROM film WHERE release_year >= %s;"
    row = query_all(sql, (min_year,))
    return row[0]["total"] if row else 0


def search_films_by_actor(full_name:str,limit:int = 10, offset:int = 0)->list[dict]:
    """Поиск фильмов по имени актера"""
    sql = """
          SELECT f.film_id, 
                 f.title, 
                 f.release_year, 
                 f.length, 
                 f.rating, 
                 '/static/images/no-poster.svg' AS poster_url
          , CONCAT(a.first_name, ' ', a.last_name) AS actor_name
          FROM film AS f
          JOIN film_actor AS fa
          ON fa.film_id = f.film_id
          JOIN actor AS a
          ON a.actor_id = fa.actor_id
          WHERE CONCAT(a.first_name, ' ', a.last_name) LIKE %s
          ORDER BY f.release_year DESC, f.film_id DESC
          LIMIT %s 
          OFFSET %s; 
          """

    pattern = f"%{full_name}%"
    return query_all(sql, (pattern, limit, offset))


def get_popular_films(limit: int = 10, offset: int = 0) -> list[dict]:
    """Получает популярные фильмы (сортировка по количеству аренды)"""
    sql = """
        SELECT f.film_id, f.title, f.release_year, f.length, f.rating, '/static/images/no-poster.svg' AS poster_url,
               GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') AS genres
        FROM film f
        LEFT JOIN inventory i ON f.film_id = i.film_id
        LEFT JOIN rental r ON i.inventory_id = r.inventory_id
        LEFT JOIN film_category fc ON f.film_id = fc.film_id
        LEFT JOIN category c ON fc.category_id = c.category_id
        GROUP BY f.film_id, f.title, f.release_year, f.length, f.rating
        ORDER BY COUNT(r.rental_id) DESC, f.release_year DESC, f.film_id DESC
        LIMIT %s OFFSET %s;
    """
    return query_all(sql, (limit, offset))


def get_top_rated_films(limit: int = 10, offset: int = 0) -> list[dict]:
    """Получает фильмы с высокими рейтингами (G, PG, PG-13)"""
    sql = """
        SELECT f.film_id, f.title, f.release_year, f.length, f.rating, '/static/images/no-poster.svg' AS poster_url,
               GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') AS genres
        FROM film f
        LEFT JOIN film_category fc ON f.film_id = fc.film_id
        LEFT JOIN category c ON fc.category_id = c.category_id
        WHERE f.rating IN ('G', 'PG', 'PG-13')
        GROUP BY f.film_id, f.title, f.release_year, f.length, f.rating
        ORDER BY 
            CASE f.rating
                WHEN 'G' THEN 1
                WHEN 'PG' THEN 2
                WHEN 'PG-13' THEN 3
                ELSE 4
            END,
            f.release_year DESC, f.film_id DESC
        LIMIT %s OFFSET %s;
    """
    return query_all(sql, (limit, offset))


def get_random_films(limit: int = 10) -> list[dict]:
    """Получает случайные фильмы"""
    sql = """
        SELECT f.film_id, f.title, f.release_year, f.length, f.rating, '/static/images/no-poster.svg' AS poster_url,
               GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') AS genres
        FROM film f
        LEFT JOIN film_category fc ON f.film_id = fc.film_id
        LEFT JOIN category c ON fc.category_id = c.category_id
        GROUP BY f.film_id, f.title, f.release_year, f.length, f.rating
        ORDER BY RAND()
        LIMIT %s;
    """
    return query_all(sql, (limit,))


def get_popular_films_count() -> int:
    """Получает общее количество популярных фильмов"""
    sql = "SELECT COUNT(*) AS total FROM film;"
    row = query_all(sql)
    return row[0]["total"] if row else 0


def get_top_rated_films_count() -> int:
    """Получает количество фильмов с высокими рейтингами"""
    sql = "SELECT COUNT(*) AS total FROM film WHERE rating IN ('G', 'PG', 'PG-13');"
    row = query_all(sql)
    return row[0]["total"] if row else 0
