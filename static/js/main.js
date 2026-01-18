// Главный файл приложения
import { SearchManager } from './modules/search.js';
import { PopularSearchesManager } from './modules/popular-searches.js';
import { UniquePopoverManager } from './modules/unique-popover.js';

// Глобальный экземпляр менеджера поиска
let searchManager;
let popularSearchesManager;
let uniquePopoverManager;
let searchTimeout;

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, начинаем инициализацию');
    
    // Создаем экземпляр менеджера поиска
    searchManager = new SearchManager();
    console.log('SearchManager created:', !!searchManager);
    
    // Создаем и инициализируем менеджер популярных поисков
    popularSearchesManager = new PopularSearchesManager();
    console.log('PopularSearchesManager created, calling init()');
    popularSearchesManager.init();
    
    // Создаем и инициализируем менеджер уникальных поисков
    setTimeout(() => {
        const uniqueBtn = document.querySelector('.unique-btn');
        if (uniqueBtn) {
            uniquePopoverManager = new UniquePopoverManager();
            console.log('UniquePopoverManager created, calling init()');
            uniquePopoverManager.init();
        } else {
            console.log('Unique button not found, skipping UniquePopoverManager initialization');
        }
    }, 100); // Небольшая задержка для уверенности
    
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
        popularSearchesManager: !!popularSearchesManager,
        uniquePopoverManager: !!uniquePopoverManager
    });
    
    // Глобальные функции для доступа из HTML - назначаем после создания менеджеров
    window.searchManager = searchManager;
    window.popularSearchesManager = popularSearchesManager;
    window.uniquePopoverManager = uniquePopoverManager;
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
