def paginate(fetch_items, fetch_total, **kwargs):
    """Универсальная функция пагинации
    fetch_items: функция для получения элементов с параметрами limit, offset и т.д.
    fetch_total: функция для получения общего количества (без limit/offset)
    Возвращает словарь с items, total, offset, limit, count
    """
    items = fetch_items(**kwargs)
    # Удаление параметров limit и offset для fetch_total, поскольку они им не нужны.
    total_kwargs = {k: v for k, v in kwargs.items() if k not in ('limit', 'offset')}
    total = fetch_total(**total_kwargs)
    offset = kwargs.get('offset', 0)
    limit = kwargs.get('limit', 10)
    return {
        "items": items,
        "total": total,
        "offset": offset,
        "limit": limit,
        "count": len(items)
    }
