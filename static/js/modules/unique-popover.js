// UI модуль для управления popover с уникальными запросами при наведении на "Уникальное"
export class UniquePopoverManager {
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
        console.log('UniquePopoverManager init() called');
        this.createPopover();
        this.setupEventListeners();
        console.log('UniquePopoverManager initialized');
    }
    
    // Создание popover элемента
    createPopover() {
        console.log('createPopover() called');
        
        // Ищем все возможные варианты кнопки
        let uniqueBtn = document.querySelector('.unique-btn');
        
        // Если не нашли, пробуем другие варианты
        if (!uniqueBtn) {
            console.log('Trying alternative selectors...');
            uniqueBtn = document.querySelector('button.nav-btn');
        }
        
        if (!uniqueBtn) {
            console.log('Trying by text content...');
            const allBtns = document.querySelectorAll('button.nav-btn');
            console.log('All nav buttons found:', Array.from(allBtns).map(b => ({text: b.textContent, className: b.className})));
            
            for (let btn of allBtns) {
                console.log('Checking button:', btn.textContent);
                if (btn.textContent.includes('Уникальное') || btn.textContent.includes('уникаль') || btn.textContent.includes('??????????')) {
                    uniqueBtn = btn;
                    console.log('Found unique button by text:', btn);
                    break;
                }
            }
        }
        
        if (!uniqueBtn) {
            console.error('Unique button not found! Available buttons:', 
                Array.from(document.querySelectorAll('button')).map(b => ({text: b.textContent})));
            return;
        }
        
        console.log('Found unique button:', uniqueBtn);
        
        // Создаем popover элемент
        const popover = document.createElement('div');
        popover.className = 'unique-popover';
        popover.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 12px;
            min-width: 280px;
            max-width: 400px;
            z-index: 9999;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.3s ease;
        `;
        
        // Убеждаемся, что родитель имеет position: relative
        const parent = uniqueBtn.parentElement;
        if (parent.style.position !== 'relative') {
            parent.style.position = 'relative';
        }
        
        // Добавляем popover в body для избежания конфликтов с dropdown CSS
        document.body.appendChild(popover);
        console.log('Popover added to body');
        
        this.popoverElement = popover;
        this.uniqueBtn = uniqueBtn;
        console.log('Popover element created and stored');
    }
    
    // Настройка обработчиков событий
    setupEventListeners() {
        console.log('setupEventListeners() called');
        
        // Используем сохраненную кнопку
        const uniqueBtn = this.uniqueBtn;
        if (!uniqueBtn) {
            console.error('Unique button not found in setupEventListeners!');
            return;
        }
        
        console.log('Setting up event listeners for unique button:', uniqueBtn);
        
        // Обработчик наведения на уникальную кнопку
        uniqueBtn.addEventListener('mouseenter', () => {
            console.log('Mouse entered unique button');
            this.handleMouseEnter();
        });
        
        uniqueBtn.addEventListener('mouseleave', () => {
            console.log('Mouse left unique button');
            this.handleMouseLeave();
        });
        
        // Обработчики для самого popover
        if (this.popoverElement) {
            this.popoverElement.addEventListener('mouseenter', () => {
                console.log('Mouse entered popover');
                this.handlePopoverMouseEnter();
            });
            
            this.popoverElement.addEventListener('mouseleave', () => {
                console.log('Mouse left popover');
                this.handlePopoverMouseLeave();
            });
        }
        
        console.log('Event listeners setup completed');
    }
    
    // Обработчик наведения на уникальную ссылку
    async handleMouseEnter() {
        console.log('handleMouseEnter() called');
        clearTimeout(this.hoverTimeout);
        
        // Задержка перед открытием для плавности
        this.hoverTimeout = setTimeout(async () => {
            console.log('Timeout triggered, calling loadAndShowPopularSearches');
            await this.loadAndShowPopularSearches();
            console.log('Popover should be visible now:', this.isVisible);
        }, 150);
    }
    
    // Обработчик ухода с уникальной ссылки
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
    
    // Загрузка и отображение популярных поисков
    async loadAndShowPopularSearches() {
        console.log('loadAndShowPopularSearches called');
        
        try {
            // Проверяем кэш
            if (this.isCacheValid()) {
                console.log('Using cached data');
                this.renderContent(this.cache);
                this.show();
                return;
            }
            
            console.log('Cache invalid, fetching fresh data...');
            
            // Показываем состояние загрузки
            this.showLoading();
            this.show();
            
            // Загружаем данные
            const data = await this.fetchPopularSearches();
            
            // Обновляем кэш
            this.cache = data;
            this.cacheTimestamp = Date.now();
            this.error = null;
            
            console.log('Data loaded and cached:', data);
            
            // Отображаем данные
            this.renderContent(data);
            
        } catch (error) {
            console.error('Error loading popular searches:', error);
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
    async fetchPopularSearches() {
        console.log('Fetching unique searches from API...');
        const { MetaAPI } = await import('./meta.js');
        const data = await MetaAPI.getUniqueQueries(5);
        console.log('API response:', data);
        return data;
    }
    
    // Показать popover
    show() {
        if (!this.popoverElement) {
            console.error('Popover element not found!');
            return;
        }
        
        if (!this.uniqueBtn) {
            console.error('Unique button not found!');
            return;
        }
        
        // Рассчитываем позицию popover относительно кнопки
        const buttonRect = this.uniqueBtn.getBoundingClientRect();
        const popover = this.popoverElement;
        
        // Устанавливаем позицию
        popover.style.position = 'fixed';
        popover.style.top = (buttonRect.bottom + window.scrollY + 5) + 'px';
        popover.style.left = (buttonRect.left + window.scrollX) + 'px';
        popover.style.zIndex = '9999';
        
        console.log('Showing popover, element:', popover);
        console.log('Button position:', buttonRect);
        console.log('Popover position set to:', {
            top: popover.style.top,
            left: popover.style.left
        });
        
        popover.classList.add('show');
        this.isVisible = true;
        console.log('Popover shown, classes:', popover.className);
    }
    
    // Скрыть popover
    hide() {
        if (!this.popoverElement) return;
        
        this.popoverElement.classList.remove('show');
        this.isVisible = false;
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
                <div class="loading-spinner" style="border: 2px solid #f3f3f3; border-top: 2px solid #3498db; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; margin: 0 auto 8px;"></div>
                <div class="loading-text" style="text-align: center; color: #666; font-size: 14px;">Загрузка...</div>
            </div>
        `;
    }
    
    // Показать ошибку
    showError() {
        if (!this.popoverElement) return;
        
        this.popoverElement.innerHTML = `
            <div class="popular-searches-error">
                <div class="error-text" style="text-align: center; color: #e74c3c; font-size: 14px; margin-bottom: 8px;">Не удалось загрузить данные</div>
                <button class="retry-btn" onclick="window.uniquePopoverManager?.loadAndShowPopularSearches()" style="display: block; margin: 0 auto; padding: 4px 12px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Повторить</button>
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
        
        let html = '<div class="unique-searches-header" style="font-weight: bold; margin-bottom: 8px; color: #333;">🎯 Уникальные запросы</div>';
        html += '<div class="unique-searches-list">';
        
        items.forEach((item, index) => {
            const displayText = this.formatSearchItem(item);
            const countText = item.count ? `(${item.count} запрос${this.getPluralForm(item.count)})` : '';
            
            html += `
                <div class="popular-search-item" style="padding: 6px 0; border-bottom: 1px solid #eee; cursor: pointer;" data-index="${index}" onclick="window.uniquePopoverManager?.applySearch(${index})">
                    <div class="search-item-text" style="font-size: 14px; color: #333; margin-bottom: 2px;">
                        ${displayText}
                        ${countText ? `<span class="search-count" style="color: #666; font-size: 12px; font-weight: normal;"> ${countText}</span>` : ''}
                    </div>
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
                <div class="empty-text" style="text-align: center; color: #999; font-size: 14px;">Пока нет уникальных запросов</div>
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
        
        // Переходим на главную страницу и применяем поиск
        window.location.href = `/?q=${encodeURIComponent(item.query)}${item.year_from ? `&from=${item.year_from}` : ''}${item.year_to ? `&to=${item.year_to}` : ''}${item.genres && item.genres.length > 0 ? `&genres=${item.genres[0]}` : ''}`;
        
        // Закрываем popover
        this.hide();
    }
    
    // Повторная попытка загрузки
    async retry() {
        this.error = null;
        await this.loadAndShowPopularSearches();
    }
    
    // Очистить кэш
    clearCache() {
        this.cache = null;
        this.cacheTimestamp = 0;
    }
}
