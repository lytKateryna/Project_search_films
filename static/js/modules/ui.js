// UI модуль для работы с интерфейсом
export class UIManager {
    // Кэш для DOM элементов
    static elements = {};
    
    // Получение элемента с кэшированием
    static getElement(id) {
        if (!this.elements[id]) {
            this.elements[id] = document.getElementById(id);
        }
        return this.elements[id];
    }
    
    // Показать загрузку
    static showLoading() {
        this.hideAllMessages();
        const loadingMessage = this.getElement('loadingMessage');
        if (loadingMessage) loadingMessage.style.display = 'block';
    }
    
    // Скрыть загрузку
    static hideLoading() {
        const loadingMessage = this.getElement('loadingMessage');
        if (loadingMessage) loadingMessage.style.display = 'none';
    }
    
    // Показать сообщение "нет результатов"
    static showNoResults() {
        this.hideAllMessages();
        const noResultsMessage = this.getElement('noResultsMessage');
        if (noResultsMessage) noResultsMessage.style.display = 'block';
    }
    
    // Показать ошибку
    static showError() {
        this.hideAllMessages();
        const errorMessage = this.getElement('errorMessage');
        if (errorMessage) errorMessage.style.display = 'block';
    }
    
    // Скрыть все сообщения
    static hideAllMessages() {
        this.hideLoading();
        const noResultsMessage = this.getElement('noResultsMessage');
        const errorMessage = this.getElement('errorMessage');
        if (noResultsMessage) noResultsMessage.style.display = 'none';
        if (errorMessage) errorMessage.style.display = 'none';
    }
    
    // Показать результаты поиска
    static showSearchResults() {
        const searchResults = this.getElement('searchResults');
        if (searchResults) searchResults.style.display = 'block';
    }
    
    // Скрыть результаты поиска
    static hideSearchResults() {
        const searchResults = this.getElement('searchResults');
        if (searchResults) searchResults.style.display = 'none';
    }
    
    // Показать новинки
    static showNewMovies() {
        const newMoviesSection = document.querySelector('.content-section');
        if (newMoviesSection) newMoviesSection.style.display = 'block';
    }
    
    // Скрыть новинки
    static hideNewMovies() {
        const newMoviesSection = document.querySelector('.content-section');
        if (newMoviesSection) newMoviesSection.style.display = 'none';
    }
    
    // Отобразить новинки
    static displayNewMovies(movies) {
        const newMoviesDiv = this.getElement('newMovies');
        if (newMoviesDiv) {
            newMoviesDiv.innerHTML = movies.map(movie => this.createMovieCard(movie)).join('');
        }
    }
    
    // Обновить заголовок поиска
    static updateSearchHeader(params) {
        const searchResults = this.getElement('searchResults');
        if (!searchResults) return;
        
        const header = searchResults.querySelector('h2');
        if (!header) return;
        
        const parts = [];
        
        if (params.query) {
            parts.push(`Поиск: "${params.query}"`);
        }
        
        // Показываем жанр только если НЕТ ключевого слова поиска
        // При поиске по названию ищем по всем жанрам, поэтому жанр не отображаем
        if (params.genreId && !params.query) {
            const genreSelect = this.getElement('yearRangeGenre');
            const genreName = genreSelect?.options[genreSelect.selectedIndex]?.text || 'Жанр';
            parts.push(`Жанр: ${genreName}`);
        }
        
        if (params.yearFrom && params.yearTo) {
            parts.push(`Годы: ${params.yearFrom}–${params.yearTo}`);
        } else if (params.yearFrom) {
            parts.push(`Год от: ${params.yearFrom}`);
        } else if (params.yearTo) {
            parts.push(`Год до: ${params.yearTo}`);
        }
        
        const subtitle = parts.length > 0 ? ` • ${parts.join(' • ')}` : '';
        header.innerHTML = `Результаты поиска${subtitle}`;
    }
    // Создать карточку фильма
    static createMovieCard(movie) {
        const title = movie.title || 'Unknown Title';
        const year = movie.release_year || movie.year || 'N/A';
        const posterUrl = movie.poster_url || movie.poster || '/static/images/no-poster.svg';
        const filmId = movie.film_id || movie.id || '';
        const genres = movie.genres || '';
        
        return `
            <div class="movie-card" onclick="window.location.href='/movie/${filmId}'">
                <img src="${posterUrl}" alt="${title}" class="movie-poster" loading="lazy" onerror="this.src='/static/images/no-poster.svg'">
                <div class="movie-info">
                    <h3 title="${title}">${title}</h3>
                    <p>${year}${genres ? ` • ${genres}` : ''}</p>
                </div>
            </div>
        `;
    }
    
    // Обновить пагинацию
    static updatePagination(total, currentPage, limit = 10) {
        const pagination = this.getElement('pagination');
        const prevBtn = this.getElement('prevBtn');
        const nextBtn = this.getElement('nextBtn');
        const pageInfo = this.getElement('pageInfo');
        
        console.log('updatePagination called:', { total, currentPage, limit });
        
        if (!pagination) return;
        
        const totalPages = Math.ceil(total / limit);
        
        console.log('Pagination info:', {
            total,
            currentPage,
            limit,
            totalPages,
            hasPrev: currentPage > 1,
            hasNext: currentPage < totalPages
        });
        
        // Скрываем пагинацию если нет результатов или всего одна страница
        if (total === 0 || totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }
        
        const hasPrev = currentPage > 1;
        const hasNext = currentPage < totalPages;
        
        if (prevBtn) prevBtn.disabled = !hasPrev;
        if (nextBtn) nextBtn.disabled = !hasNext;
        if (pageInfo) pageInfo.textContent = `Страница ${currentPage} из ${totalPages}`;
        
        pagination.style.display = 'flex';
    }
    
    // Сбросить фильтры
    static resetFilters() {
        const elements = ['searchInput', 'yearFrom', 'yearTo', 'yearRangeGenre'];
        elements.forEach(id => {
            const element = this.getElement(id);
            if (element) element.value = '';
        });
    }
}
