// Главный файл приложения
import { SearchManager } from './modules/search.js';
import { DropdownManager } from './modules/dropdown-manager.js';
import { MetaAPI } from './modules/meta.js';

// Глобальный экземпляр менеджера поиска
let searchManager;
let dropdownManager;
let searchTimeout;

// Глобальная функция для загрузки уникальных запросов (для страницы /unique)
window.loadUniqueQueriesGlobal = async function() {
    console.log('loadUniqueQueriesGlobal called');
    
    const loadingMessage = document.getElementById('uniqueLoadingMessage');
    const errorMessage = document.getElementById('uniqueErrorMessage');
    const noResultsMessage = document.getElementById('uniqueNoResultsMessage');
    const queriesList = document.getElementById('uniqueQueriesList');
    
    console.log('Elements found:', {
        loadingMessage: !!loadingMessage,
        errorMessage: !!errorMessage,
        noResultsMessage: !!noResultsMessage,
        queriesList: !!queriesList
    });
    
    // Показываем загрузку
    if (loadingMessage) loadingMessage.style.display = 'block';
    if (errorMessage) errorMessage.style.display = 'none';
    if (noResultsMessage) noResultsMessage.style.display = 'none';
    if (queriesList) queriesList.innerHTML = '';
    
    try {
        console.log('Calling MetaAPI.getUniqueQueries...');
        const data = await MetaAPI.getUniqueQueries(20);
        console.log('Data received:', data);
        
        if (loadingMessage) loadingMessage.style.display = 'none';
        
        if (data.items && data.items.length > 0) {
            console.log('Rendering queries...');
            window.renderUniqueQueriesGlobal(data.items);
        } else {
            console.log('No queries found');
            if (noResultsMessage) noResultsMessage.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error loading unique queries:', error);
        if (loadingMessage) loadingMessage.style.display = 'none';
        if (errorMessage) errorMessage.style.display = 'block';
    }
};

// Глобальная функция для отображения уникальных запросов
window.renderUniqueQueriesGlobal = function(items) {
    const queriesList = document.getElementById('uniqueQueriesList');
    
    let html = '<div class="unique-queries-grid">';
    
    items.forEach((item, index) => {
        const displayText = window.formatSearchItemGlobal(item);
        const timestamp = item.timestamp ? new Date(item.timestamp).toLocaleString('ru-RU') : '';
        
        html += `
            <div class="unique-query-card" onclick="window.applyUniqueSearchGlobal(${index})" data-index="${index}">
                <div class="query-text">${displayText}</div>
                <div class="query-meta">
                    <span class="query-type">${window.getSearchTypeLabelGlobal(item.search_type)}</span>
                    <span class="query-time">${timestamp}</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    queriesList.innerHTML = html;
    
    // Сохраняем данные для использования в applyUniqueSearch
    window.uniqueQueriesData = items;
};

// Глобальные функции форматирования
window.formatSearchItemGlobal = function(item) {
    if (item.display_text) {
        return item.display_text;
    }
    
    let parts = [];
    
    if (item.query) parts.push(`"${item.query}"`);
    if (item.params && item.params.genres && item.params.genres.length > 0) {
        parts.push(`жанры: ${item.params.genres.join(', ')}`);
    }
    if (item.params && (item.params.year_from || item.params.year_to)) {
        const yearRange = item.params.year_from && item.params.year_to 
            ? `${item.params.year_from}-${item.params.year_to}`
            : item.params.year_from || item.params.year_to;
        parts.push(`годы: ${yearRange}`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Поиск';
};

window.getSearchTypeLabelGlobal = function(searchType) {
    const labels = {
        'keyword': 'Поиск',
        'genre': 'Жанр',
        'year': 'Год',
        'manual': 'Ручной'
    };
    return labels[searchType] || 'Другое';
};

window.applyUniqueSearchGlobal = function(index) {
    if (!window.uniqueQueriesData || !window.uniqueQueriesData[index]) {
        console.error('Search item not found at index:', index);
        return;
    }
    
    const item = window.uniqueQueriesData[index];
    console.log('Applying unique search:', item);
    
    let url = '/?';
    const params = new URLSearchParams();
    
    if (item.query) {
        params.append('q', item.query);
    }
    
    if (item.params) {
        if (item.params.year_from) params.append('from', item.params.year_from);
        if (item.params.year_to) params.append('to', item.params.year_to);
        if (item.params.genres && item.params.genres.length > 0) {
            params.append('genres', item.params.genres[0]);
        }
    }
    
    url += params.toString();
    window.location.href = url;
};

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, начинаем инициализацию');
    
    // Создаем экземпляр менеджера поиска
    searchManager = new SearchManager();
    console.log('SearchManager created:', !!searchManager);
    
    // Создаем и инициализируем менеджер выпадающих меню
    dropdownManager = new DropdownManager();
    console.log('DropdownManager created, calling init()');
    dropdownManager.init();
    
    // Инициализируем базовые функции
    searchManager.loadGenres();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Инициализируем контент из URL параметров
    setTimeout(() => {
        searchManager.initializeFromURL().then(() => {
            console.log('URL initialization completed');
        }).catch(error => {
            console.error('Error during URL initialization:', error);
        });
    }, 200); // Небольшая задержка для уверенности
    
    console.log('Инициализация завершена');
    console.log('Global variables:', {
        searchManager: !!searchManager,
        dropdownManager: !!dropdownManager
    });
    
    // Глобальные функции для доступа из HTML - назначаем после создания менеджеров
    window.searchManager = searchManager;
    window.dropdownManager = dropdownManager;
    window.searchByKeyword = () => searchManager.searchByKeyword();
    window.searchByYearRange = () => searchManager.searchByYearRange();
    window.previousPage = () => searchManager.previousPage();
    window.nextPage = () => searchManager.nextPage();
    
    console.log('Global variables assigned to window:', {
        searchManager: !!window.searchManager,
        searchByKeyword: !!window.searchByKeyword
    });
});

// Debounce функция для поиска
function debounceSearch(callback, delay = 500) {
    return function(...args) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => callback.apply(this, args), delay);
    };
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Убираем автоматические обработчики поиска при вводе
    // Поиск теперь инициируется только по нажатию кнопок
    
    console.log('Event listeners setup completed - manual search only');
}
