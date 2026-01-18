// UI модуль для управления popover с последними поисками
export class PopularSearchesManager {
    constructor() {
        this.cache = null;
        this.cacheTimestamp = 0;
        this.cacheTimeout = 60000; // 60 секунд
        this.hoverTimeout = null;
        this.isVisible = false;
        this.popoverElement = null;
        this.isLoading = false;
        this.error = null;
    }
    
    // Инициализация
    init() {
        console.log('PopularSearchesManager init() called');
        this.createPopover();
        this.setupEventListeners();
        console.log('PopularSearchesManager initialized');
    }
    
    // Создание popover элемента
    createPopover() {
        console.log('createPopover() called');
        // Находим dropdown контейнер
        const dropdownContent = document.querySelector('.dropdown-content');
        if (!dropdownContent) {
            console.error('Dropdown content not found!');
            return;
        }
        
        // Сохраняем ссылку на popover
        this.popoverElement = dropdownContent;
        console.log('Popover element created and stored');
    }
    
    // Настройка обработчиков событий
    setupEventListeners() {
        console.log('setupEventListeners() called');
        const dropdown = document.querySelector('.dropdown');
        if (!dropdown) {
            console.error('Dropdown not found!');
            return;
        }
        
        console.log('Dropdown found, setting up event listeners');
        
        // Обработчик наведения на dropdown
        dropdown.addEventListener('mouseenter', () => {
            console.log('Mouse entered dropdown');
            this.handleMouseEnter();
        });
        
        dropdown.addEventListener('mouseleave', () => {
            console.log('Mouse left dropdown');
            this.handleMouseLeave();
        });
        
        // Обработчики для самого popover
        this.popoverElement.addEventListener('mouseenter', () => {
            console.log('Mouse entered popover');
            this.handlePopoverMouseEnter();
        });
        
        this.popoverElement.addEventListener('mouseleave', () => {
            console.log('Mouse left popover');
            this.handlePopoverMouseLeave();
        });
        
        console.log('Event listeners setup completed');
    }
    
    // Обработчик наведения на dropdown
    async handleMouseEnter() {
        console.log('handleMouseEnter() called');
        clearTimeout(this.hoverTimeout);
        
        // Задержка перед открытием для плавности
        this.hoverTimeout = setTimeout(async () => {
            console.log('Timeout triggered, calling loadAndShowRecentSearches');
            await this.loadAndShowRecentSearches();
        }, 150);
    }
    
    // Обработчик ухода с dropdown
    handleMouseLeave() {
        clearTimeout(this.hoverTimeout);
        
        // Задержка перед закрытием
        this.hoverTimeout = setTimeout(() => {
            if (!this.isVisible) {
                this.hide();
            }
        }, 300);
    }
    
    // Обработчик наведения на popover
    handlePopoverMouseEnter() {
        clearTimeout(this.hoverTimeout);
        this.isVisible = true;
    }
    
    // Обработчик ухода с popover
    handlePopoverMouseLeave() {
        this.isVisible = false;
        this.hide();
    }
    
    // Загрузка и отображение последних поисков
    async loadAndShowRecentSearches() {
        console.log('loadAndShowRecentSearches called');
        
        try {
            // Проверяем кэш
            if (this.isCacheValid()) {
                console.log('Using cached data');
                this.renderContent(this.cache);
                return;
            }
            
            console.log('Cache invalid, fetching fresh data...');
            
            // Показываем состояние загрузки
            this.showLoading();
            
            // Загружаем данные
            const data = await this.fetchRecentSearches();
            
            // Обновляем кэш
            this.cache = data;
            this.cacheTimestamp = Date.now();
            this.error = null;
            
            console.log('Data loaded and cached:', data);
            
            // Отображаем данные
            this.renderContent(data);
            
        } catch (error) {
            console.error('Error loading recent searches:', error);
            this.error = error;
            this.showError();
        }
    }
    
    // Проверка валидности кэша
    isCacheValid() {
        return this.cache && 
               (Date.now() - this.cacheTimestamp) < this.cacheTimeout;
    }
    
    // Загрузка данных с API
    async fetchRecentSearches(type = 'recent') {
        console.log(`Fetching ${type} searches from API...`);
        const { MetaAPI } = await import('./meta.js');
        
        let data;
        if (type === 'popular') {
            data = await MetaAPI.getPopularQueries(5);
        } else {
            data = await MetaAPI.getRecentQueries(5);
        }
        
        console.log('API response:', data);
        return data;
    }
    
    // Показать состояние загрузки
    showLoading() {
        this.isLoading = true;
        this.renderLoadingState();
    }
    
    // Отобразить состояние загрузки
    renderLoadingState() {
        if (!this.popoverElement) return;
        
        this.popoverElement.innerHTML = `
            <div class="popular-searches-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Загрузка...</div>
            </div>
        `;
    }
    
    // Показать ошибку
    showError() {
        if (!this.popoverElement) return;
        
        this.popoverElement.innerHTML = `
            <div class="popular-searches-error">
                <div class="error-text">Не удалось загрузить историю</div>
                <button class="retry-btn" onclick="window.popularSearchesManager?.retry()">Повторить</button>
            </div>
        `;
    }
    
    // Отобразить контент
    renderContent(data) {
        if (!this.popoverElement) return;
        
        const items = data.items || [];
        
        if (items.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        // Определяем, популярные это запросы или последние
        const isPopular = items.some(item => item.count !== undefined);
        const headerText = isPopular ? 'Популярные запросы' : 'Последние поиски';
        
        let html = `<div class="popular-searches-header">${headerText}</div>`;
        html += '<div class="popular-searches-list">';
        
        items.forEach((item, index) => {
            const displayText = this.formatSearchItem(item);
            const timestamp = this.formatTimestamp(item.timestamp);
            const countText = item.count ? `(${item.count} запрос${this.getPluralForm(item.count)})` : '';
            
            html += `
                <div class="popular-search-item" data-index="${index}">
                    <div class="search-item-text" onclick="window.popularSearchesManager?.applySearch(${index})">
                        ${displayText}
                        ${countText ? `<span class="search-count">${countText}</span>` : ''}
                    </div>
                    <div class="search-item-timestamp">${timestamp}</div>
                </div>
            `;
        });
        
        html += '</div>';
        
        this.popoverElement.innerHTML = html;
        console.log('Popular searches rendered:', items.length, 'items');
    }
    
    // Отобразить пустое состояние
    renderEmptyState() {
        if (!this.popoverElement) return;
        
        this.popoverElement.innerHTML = `
            <div class="popular-searches-empty">
                <div class="empty-text">История поисков пуста</div>
            </div>
        `;
    }
    
    // Форматирование элемента поиска
    formatSearchItem(item) {
        // Если есть готовый display_text, используем его
        if (item.display_text) {
            return item.display_text;
        }
        
        // Иначе формируем из параметров
        let parts = [];
        
        if (item.query) parts.push(`"${item.query}"`);
        if (item.genres && item.genres.length > 0) parts.push(`жанры: ${item.genres.join(', ')}`);
        if (item.year_from || item.year_to) {
            const yearRange = item.year_from && item.year_to 
                ? `${item.year_from}-${item.year_to}`
                : item.year_from || item.year_to;
            parts.push(`годы: ${yearRange}`);
        }
        
        return parts.length > 0 ? parts.join(', ') : 'Поиск';
    }
    
    // Форматирование временной метки
    formatTimestamp(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffDays > 0) {
            return `${diffDays} дн. назад`;
        } else if (diffHours > 0) {
            return `${diffHours} ч. назад`;
        } else {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return diffMinutes > 0 ? `${diffMinutes} мин. назад` : 'только что';
        }
    }
    
    // Получение правильной формы слова "запрос"
    getPluralForm(count) {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;
        
        if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
            return 'ов';
        }
        
        if (lastDigit === 1) {
            return '';
        }
        
        if (lastDigit >= 2 && lastDigit <= 4) {
            return 'а';
        }
        
        return 'ов';
    }
    
    // Применить поиск
    applySearch(index) {
        if (!this.cache || !this.cache.items || !this.cache.items[index]) {
            console.error('Search item not found at index:', index);
            return;
        }
        
        const item = this.cache.items[index];
        console.log('Applying search:', item);
        
        // Применяем параметры поиска
        if (window.searchManager) {
            // Устанавливаем значения в форму
            const searchInput = document.getElementById('searchInput');
            const yearFrom = document.getElementById('yearFrom');
            const yearTo = document.getElementById('yearTo');
            const yearRangeGenre = document.getElementById('yearRangeGenre');
            
            if (searchInput && item.query) {
                searchInput.value = item.query;
            }
            
            if (yearFrom && item.year_from) {
                yearFrom.value = item.year_from;
            }
            
            if (yearTo && item.year_to) {
                yearTo.value = item.year_to;
            }
            
            if (yearRangeGenre && item.genres && item.genres.length > 0) {
                yearRangeGenre.value = item.genres[0]; // Берем первый жанр
            }
            
            // Выполняем поиск
            window.searchManager.performCombinedSearch();
        }
        
        // Закрываем popover
        this.hide();
    }
    
    // Повторная попытка загрузки
    async retry() {
        this.error = null;
        await this.loadAndShowRecentSearches();
    }
    
    // Скрыть popover
    hide() {
        this.isVisible = false;
        // CSS скроет popover через :hover
    }
    
    // Очистить кэш
    clearCache() {
        this.cache = null;
        this.cacheTimestamp = 0;
    }
}
