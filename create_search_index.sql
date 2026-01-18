-- Создание индекса для ускорения поиска по названию фильма
CREATE INDEX IF NOT EXISTS idx_film_title ON film(title);

-- Создание составного индекса для сортировки
CREATE INDEX IF NOT EXISTS idx_film_release_year_id ON film(release_year DESC, film_id DESC);

-- Показать информацию об индексах
SHOW INDEX FROM film;
