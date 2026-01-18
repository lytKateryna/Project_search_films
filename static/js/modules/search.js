// Модуль поиска фильмов
import { MovieAPI } from './api.js';
import { UIManager } from './ui.js';
import { MetaAPI } from './meta.js';

export class SearchManager {
    constructor() {
        this.state = {
            currentPage: 1,
            limit: 10,
            isLoading: false,
            mode: 'NEW', // 'NEW' или 'SEARCH'
            currentTotal: 0,
            filters: {
                query: '',
                yearFrom: '',
                yearTo: '',
                genreId: ''
            }
        };
        this.abortController = null;
        this.lastRequestKey = null; // Для дедупликации запросов
        this.searchCache = new Map(); // Простое кэширование результатов
        this.cacheTimeout = 5 * 60 * 1000; // 5 минут
    }
    
    // Инициализация из URL параметров
    async initializeFromURL() {
        // Сначала загружаем диапазон годов
        await this.loadYearRange();
        
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.toString()) {
            // Есть параметры - режим поиска
            const query = urlParams.get('q') || '';
            const genres = urlParams.get('genres')?.split(',').filter(Boolean) || [];
            const yearFrom = urlParams.get('from') || '';
            const yearTo = urlParams.get('to') || '';
            
            // Устанавливаем значения в форму (переписывая значения по умолчанию)
            if (query) UIManager.getElement('searchInput').value = query;
            if (yearFrom) {
                UIManager.getElement('yearFrom').value = yearFrom;
                console.log('Установлено значение yearFrom из URL:', yearFrom);
            }
            if (yearTo) {
                UIManager.getElement('yearTo').value = yearTo;
                console.log('Установлено значение yearTo из URL:', yearTo);
            }
            // Устанавливаем жанр только если НЕТ ключевого слова поиска
            // При поиске по названию жанр игнорируется (поиск по всем жанрам)
            if (genres.length > 0 && !query) {
                UIManager.getElement('yearRangeGenre').value = genres[0];
                console.log('Установлен жанр из URL (нет ключевого слова):', genres[0]);
            } else if (genres.length > 0 && query) {
                console.log('Жанр из URL проигнорирован - при поиске по названию ищем по всем жанрам');
                // Сбрасываем выбор жанра в UI
                const genreSelect = UIManager.getElement('yearRangeGenre');
                if (genreSelect) genreSelect.value = '';
            }
            
            // Выполняем комбинированный поиск
            this.performCombinedSearch();
        } else {
            // Нет параметров - режим новинок, оставляем значения по умолчанию из loadYearRange()
            console.log('Нет URL параметров, используем значения по умолчанию');
            this.loadNewMovies();
        }
    }
    
    // Обновить URL параметрами
    updateURL(params) {
        const urlParams = new URLSearchParams();
        
        if (params.query) urlParams.set('q', params.query);
        if (params.yearFrom) urlParams.set('from', params.yearFrom);
        if (params.yearTo) urlParams.set('to', params.yearTo);
        // НЕ включаем жанр в URL при поиске по ключевому слову
        // так как поиск по названию всегда работает по всем жанрам
        if (params.genreId && !params.query) urlParams.set('genres', params.genreId);
        
        const newURL = urlParams.toString() 
            ? `${window.location.pathname}?${urlParams.toString()}`
            : window.location.pathname;
            
        window.history.replaceState({}, '', newURL);
    }
    
    // Получить текущее смещение
    getOffset() {
        return (this.state.currentPage - 1) * this.state.limit;
    }
    
    // Получить ключ запроса для дедупликации
    getRequestKey() {
        const { filters, currentPage, limit } = this.state;
        return JSON.stringify({ ...filters, currentPage, limit });
    }
    
    // Получить ключ для кэша
    getCacheKey(params) {
        return JSON.stringify(params);
    }
    
    // Получить из кэша
    getFromCache(cacheKey) {
        const cached = this.searchCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log('Cache hit for:', cacheKey);
            return cached.data;
        }
        return null;
    }
    
    // Сохранить в кэш
    setCache(cacheKey, data) {
        this.searchCache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });
        console.log('Cached result for:', cacheKey);
        
        // Очищаем старые записи из кэша
        if (this.searchCache.size > 50) {
            const oldestKey = this.searchCache.keys().next().value;
            this.searchCache.delete(oldestKey);
        }
    }
    
    // Проверить, активен ли поиск
    isSearchActive() {
        const { query, yearFrom, yearTo, genreId } = this.state.filters;
        return query.length > 0 || yearFrom || yearTo || genreId;
    }
    
    // Получить все параметры фильтров
    getFilterParams() {
        const searchInput = UIManager.getElement('searchInput');
        const yearFrom = UIManager.getElement('yearFrom');
        const yearTo = UIManager.getElement('yearTo');
        const yearRangeGenre = UIManager.getElement('yearRangeGenre');
        
        const params = {
            query: searchInput?.value?.trim() || '',
            yearFrom: yearFrom?.value || '',
            yearTo: yearTo?.value || '',
            genreId: yearRangeGenre?.value || ''
        };
        
        console.log('getFilterParams result:', params);
        console.log('DOM elements:', {
            searchInput: !!searchInput,
            yearFrom: !!yearFrom,
            yearTo: !!yearTo,
            yearRangeGenre: !!yearRangeGenre
        });
        
        return params;
    }
    
    // Обновить фильтры в состоянии
    updateFilters() {
        this.state.filters = this.getFilterParams();
    }
    
    // Переключить режим
    setMode(newMode) {
        this.state.mode = newMode;
        if (newMode === 'NEW') {
            UIManager.showNewMovies();
            UIManager.hideSearchResults();
        } else {
            UIManager.hideNewMovies();
            UIManager.showSearchResults();
        }
    }
    
    // Загрузить жанры
    async loadGenres() {
        if (this.state.isLoading) return;
        
        try {
            console.log('Загружаю жанры...');
            const data = await MovieAPI.getGenres();
            const genres = data.items || [];
            console.log('Жанры загружены:', genres);
            
            this.populateGenreDropdown(genres);
            this.populateGenreList(genres);
        } catch (error) {
            console.error('Error loading genres:', error);
            UIManager.showError();
        }
    }
    
    // Загрузить диапазон годов
    async loadYearRange() {
        try {
            console.log('Загружаю диапазон годов...');
            const data = await MetaAPI.getYearRange();
            console.log('Диапазон годов загружен:', data);
            
            // Ждем пока DOM будет готов
            if (document.readyState !== 'complete') {
                console.log('DOM еще не готов, ждем...');
                await new Promise(resolve => {
                    if (document.readyState === 'complete') {
                        resolve();
                    } else {
                        window.addEventListener('load', resolve, { once: true });
                    }
                });
            }
            
            const yearFrom = UIManager.getElement('yearFrom');
            const yearTo = UIManager.getElement('yearTo');
            
            console.log('Найдены элементы:', { yearFrom: !!yearFrom, yearTo: !!yearTo });
            
            if (yearFrom && data.min_year) {
                yearFrom.placeholder = `От ${data.min_year}`;
                yearFrom.min = data.min_year;
                console.log('Установлен placeholder для yearFrom:', yearFrom.placeholder);
            }
            
            if (yearTo && data.max_year) {
                yearTo.placeholder = `До ${data.max_year}`;
                yearTo.max = data.max_year;
                console.log('Установлен placeholder для yearTo:', yearTo.placeholder);
            }
            
            // Устанавливаем значения по умолчанию если поля пустые
            if (yearFrom && !yearFrom.value && data.min_year) {
                yearFrom.value = data.min_year;
                console.log('Установлено значение yearFrom:', yearFrom.value);
            }
            if (yearTo && !yearTo.value && data.max_year) {
                yearTo.value = data.max_year;
                console.log('Установлено значение yearTo:', yearTo.value);
            }
            
        } catch (error) {
            console.error('Error loading year range:', error);
            // Устанавливаем значения по умолчанию в случае ошибки
            const yearFrom = UIManager.getElement('yearFrom');
            const yearTo = UIManager.getElement('yearTo');
            
            if (yearFrom) {
                yearFrom.placeholder = 'От 1900';
                yearFrom.min = 1900;
                if (!yearFrom.value) yearFrom.value = 1900;
            }
            
            if (yearTo) {
                yearTo.placeholder = 'До 2025';
                yearTo.max = 2025;
                if (!yearTo.value) yearTo.value = 2025;
            }
        }
    }
    
    // Заполнить выпадающий список жанров
    populateGenreDropdown(genres) {
        const yearRangeGenre = UIManager.getElement('yearRangeGenre');
        if (!yearRangeGenre) return;
        
        // Очищаем перед заполнением
        yearRangeGenre.innerHTML = '';
        
        // Используем DocumentFragment для оптимизации
        const fragment = document.createDocumentFragment();
        
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre.category_id;
            option.textContent = genre.name;
            fragment.appendChild(option);
        });
        
        yearRangeGenre.appendChild(fragment);
    }
    
    // Заполнить список жанров
    populateGenreList(genres) {
        const genresList = UIManager.getElement('genresList');
        if (!genresList) return;
        
        genresList.innerHTML = '';
        
        const fragment = document.createDocumentFragment();
        
        genres.forEach(genre => {
            const button = document.createElement('button');
            button.textContent = genre.name;
            button.onclick = () => this.searchByGenre(genre.category_id, genre.name);
            fragment.appendChild(button);
        });
        
        genresList.appendChild(fragment);
    }
    
    // Загрузить новые фильмы
    async loadNewMovies() {
        if (this.state.isLoading) return;
        
        console.log('Начинаю загрузку новых фильмов...');
        this.setMode('NEW');
        
        // Проверяем дедупликацию
        const requestKey = `new-${this.state.currentPage}-${this.state.limit}`;
        if (this.lastRequestKey === requestKey) {
            console.log('Request already in progress:', requestKey);
            return;
        }
        
        // Отменяем предыдущий запрос если есть
        if (this.abortController) {
            this.abortController.abort();
        }
        
        this.abortController = new AbortController();
        this.lastRequestKey = requestKey;
        this.state.isLoading = true;
        
        try {
            UIManager.showLoading();
            const offset = this.getOffset();
            const data = await MovieAPI.getNewMovies(this.state.limit, offset, this.abortController.signal);
            console.log('Данные загружены:', data);
            const movies = data.items || [];
            const total = data.total || 0;
            
            // Сохраняем общее количество для пагинации
            this.state.currentTotal = total;
            
            console.log('loadNewMovies:', {
                movies: movies.length,
                total,
                currentPage: this.state.currentPage,
                offset
            });
            
            if (movies.length === 0) {
                UIManager.showNoResults();
                return;
            }
            
            UIManager.displayNewMovies(movies);
            UIManager.updatePagination(total, this.state.currentPage, this.state.limit);
            console.log('Фильмы добавлены в DOM');
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error loading new movies:', error);
                UIManager.showError();
            }
        } finally {
            this.state.isLoading = false;
            this.abortController = null;
            this.lastRequestKey = null;
            UIManager.hideLoading();
        }
    }
    
    // Сбросить пагинацию при изменении фильтров
    resetPaginationForNewSearch() {
        this.state.currentPage = 1;
    }
    
    // Поиск по ключевому слову
    async searchByKeyword() {
        console.log('searchByKeyword called');
        this.resetPaginationForNewSearch();
        await this.performCombinedSearch();
    }
    
    // Поиск по диапазону лет
    async searchByYearRange() {
        this.resetPaginationForNewSearch();
        await this.performCombinedSearch();
    }
    
    // Поиск по жанру
    async searchByGenre(genreId, genreName) {
        // Устанавливаем выбранный жанр в выпадающий список
        const genreSelect = UIManager.getElement('yearRangeGenre');
        if (genreSelect) genreSelect.value = genreId;
        
        this.resetPaginationForNewSearch();
        await this.performCombinedSearch();
    }
    
    // Выполнить комбинированный поиск
    async performCombinedSearch() {
        console.log('performCombinedSearch called');
        if (this.state.isLoading) return;
        
        // Обновляем фильтры из UI
        this.updateFilters();
        const params = this.state.filters;
        console.log('Search params:', params);
        
        // Если нет активных фильтров, возвращаемся к новинкам
        if (!this.isSearchActive()) {
            console.log('No active filters, resetting to new movies');
            this.resetToNewMovies();
            return;
        }
        
        // Проверяем кэш
        const cacheKey = this.getCacheKey({...params, currentPage: this.state.currentPage, limit: this.state.limit});
        const cachedResult = this.getFromCache(cacheKey);
        if (cachedResult) {
            this.displaySearchResults(cachedResult.items, cachedResult.total);
            UIManager.updateSearchHeader(params);
            this.updateURL(params);
            return;
        }
        
        // Проверяем дедупликацию
        const requestKey = this.getRequestKey();
        if (this.lastRequestKey === requestKey) {
            console.log('Request already in progress:', requestKey);
            return;
        }
        
        // Отменяем предыдущий запрос если есть
        if (this.abortController) {
            this.abortController.abort();
        }
        
        this.abortController = new AbortController();
        this.lastRequestKey = requestKey;
        this.state.isLoading = true;
        
        try {
            this.setMode('SEARCH');
            UIManager.showLoading();
            
            let data;
            const offset = this.getOffset();
            
            // Определяем какой эндпоинт использовать на основе активных фильтров
            if (params.query) {
                // Приоритет поиска по ключевому слову - всегда ищем по всем жанрам
                console.log('Using keyword search as primary (searches across all genres)');
                const allData = await MovieAPI.searchByKeyword(
                    params.query,
                    1000, // Большой лимит для получения всех результатов
                    0,
                    this.abortController.signal
                );
                console.log('API response:', allData);
                
                // Фильтруем по годам и жанру (если указаны)
                const allFilteredItems = this.filterResults(allData.items || [], params);
                console.log('Filtered items:', allFilteredItems.length);
                const total = allFilteredItems.length;
                
                // Применяем пагинацию к отфильтрованным результатам
                const startIndex = offset;
                const endIndex = startIndex + this.state.limit;
                data = {
                    items: allFilteredItems.slice(startIndex, endIndex),
                    total: total,
                    count: Math.min(this.state.limit, allFilteredItems.length - startIndex)
                };
                console.log('Final data after pagination:', data);
            } else if (params.yearFrom && params.yearTo) {
                // Диапазон лет (с опциональным жанром) - только если нет ключевого слова
                console.log('Using year range search (no keyword)');
                data = await MovieAPI.searchByYearRange(
                    params.yearFrom,
                    params.yearTo,
                    params.genreId || null,
                    this.state.limit,
                    offset,
                    this.abortController.signal
                );
                console.log('API response:', data);
            } else if (params.genreId) {
                // Только жанр - только если нет ключевого слова и годовых фильтров
                console.log('Using genre search only (no keyword, no year filters)');
                data = await MovieAPI.searchByGenre(
                    params.genreId,
                    this.state.limit,
                    offset,
                    this.abortController.signal
                );
                console.log('API response:', data);
            } else {
                // Нет подходящего эндпоинта
                console.log('No suitable endpoint found');
                data = { items: [], total: 0 };
            }
            
            const movies = data.items || [];
            const total = data.total || 0;
            
            // Сохраняем общее количество для пагинации
            this.state.currentTotal = total;
            
            if (movies.length === 0) {
                UIManager.showNoResults();
                return;
            }
            
            this.displaySearchResults(movies, total);
            UIManager.updateSearchHeader(params);
            this.updateURL(params);
            
            // Сохраняем в кэш
            const cacheKey = this.getCacheKey({...params, currentPage: this.state.currentPage, limit: this.state.limit});
            this.setCache(cacheKey, {items: movies, total: total});
            
            // Сохраняем поисковый запрос в MongoDB если он есть (закомментировано из-за ошибки ObjectId)
            // if (params.query) {
            //     this.saveSearchToMeta(params);
            // }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Search error:', error);
                UIManager.showError();
            }
        } finally {
            this.state.isLoading = false;
            this.abortController = null;
            this.lastRequestKey = null;
            UIManager.hideLoading();
        }
    }
    
    // Сохранить поисковый запрос в MongoDB
    async saveSearchToMeta(params) {
        try {
            const { MetaAPI } = await import('./meta.js');
            
            // Формируем объект поискового запроса
            const searchQuery = {
                query: params.query,
                year_from: params.yearFrom || null,
                year_to: params.yearTo || null,
                genres: params.genreId ? [params.genreId] : [],
                timestamp: new Date().toISOString()
            };
            
            // Сохраняем в MongoDB
            await MetaAPI.saveSearchQuery(searchQuery);
            console.log('Search query saved to MongoDB:', searchQuery);
            
            // Очищаем кэш популярных поисков, чтобы обновить данные
            if (window.popularSearchesManager) {
                window.popularSearchesManager.clearCache();
            }
            
        } catch (error) {
            console.error('Error saving search to MongoDB:', error);
            // Не прерываем поиск, если не удалось сохранить
        }
    }
    
    // Фильтрация результатов на клиенте
    filterResults(movies, params) {
        console.log('filterResults called with:', { movies: movies.length, params });
        
        const filtered = movies.filter(movie => {
            const year = movie.release_year || movie.year;
            
            // Фильтр по году
            if (params.yearFrom && year < parseInt(params.yearFrom)) {
                console.log(`Filtered out ${movie.title} - year ${year} < ${params.yearFrom}`);
                return false;
            }
            if (params.yearTo && year > parseInt(params.yearTo)) {
                console.log(`Filtered out ${movie.title} - year ${year} > ${params.yearTo}`);
                return false;
            }
            
            // ИГНОРИРУЕМ фильтр по жанру при поиске по ключевому слову
            // Поиск по названию всегда работает по всем жанрам
            if (params.genreId) {
                console.log(`Ignoring genre filter for ${movie.title} - keyword search works across all genres`);
            }
            
            console.log(`Included ${movie.title}`);
            return true;
        });
        
        console.log(`filterResults: ${filtered.length} of ${movies.length} movies passed filtering`);
        return filtered;
    }
    
    // Отобразить результаты поиска
    displaySearchResults(movies, total) {
        console.log('displaySearchResults called with:', { movies: movies.length, total });
        const moviesList = UIManager.getElement('moviesList');
        const searchResults = UIManager.getElement('searchResults');
        
        console.log('DOM elements found:', { moviesList: !!moviesList, searchResults: !!searchResults });
        
        if (moviesList) {
            // Используем DocumentFragment для оптимизации
            const fragment = document.createDocumentFragment();
            
            movies.forEach(movie => {
                const div = document.createElement('div');
                div.innerHTML = UIManager.createMovieCard(movie);
                fragment.appendChild(div.firstElementChild);
            });
            
            moviesList.innerHTML = '';
            moviesList.appendChild(fragment);
            console.log('Movies added to DOM');
        }
        
        if (searchResults) {
            searchResults.style.display = 'block';
            console.log('Search results section shown');
        }
        
        UIManager.updatePagination(total, this.state.currentPage, this.state.limit);
    }
    
    // Переход на предыдущую страницу
    async previousPage() {
        if (this.state.currentPage > 1 && !this.state.isLoading) {
            this.state.currentPage--;
            if (this.isSearchActive()) {
                await this.performCombinedSearch();
            } else {
                await this.loadNewMovies();
            }
        }
    }
    
    // Переход на следующую страницу
    async nextPage() {
        if (!this.state.isLoading) {
            // Проверяем, есть ли следующая страница
            const currentTotal = this.state.currentTotal || 0;
            const totalPages = Math.ceil(currentTotal / this.state.limit);
            
            console.log('nextPage called:', {
                currentPage: this.state.currentPage,
                currentTotal,
                totalPages,
                hasNext: this.state.currentPage < totalPages
            });
            
            if (this.state.currentPage >= totalPages) {
                console.log('No next page available');
                return; // Не переходим дальше последней страницы
            }
            
            this.state.currentPage++;
            console.log('Moving to page:', this.state.currentPage);
            
            if (this.isSearchActive()) {
                await this.performCombinedSearch();
            } else {
                await this.loadNewMovies();
            }
        }
    }
    
    // Сбросить все фильтры
    resetAllFilters() {
        UIManager.resetFilters();
        this.state.currentPage = 1;
        this.state.filters = {
            query: '',
            yearFrom: '',
            yearTo: '',
            genreId: ''
        };
        window.history.replaceState({}, '', window.location.pathname);
        this.resetToNewMovies();
    }
    
    // Вернуться к новинкам
    resetToNewMovies() {
        this.state.currentPage = 1;
        this.state.filters = {
            query: '',
            yearFrom: '',
            yearTo: '',
            genreId: ''
        };
        this.loadNewMovies();
    }
}
