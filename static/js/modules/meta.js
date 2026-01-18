// API модуль для работы с мета-данными (поисковые запросы)
export class MetaAPI {
    static BASE_URL = '/meta';
    
    // Получить последние поисковые запросы
    static async getRecentQueries(limit = 5) {
        try {
            const response = await fetch(`${this.BASE_URL}/recent?limit=${limit}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching recent queries:', error);
            throw error;
        }
    }
    
    // Сохранить поисковый запрос
    static async saveSearchQuery(searchQuery) {
        try {
            const response = await fetch(`${this.BASE_URL}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(searchQuery)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error saving search query:', error);
            throw error;
        }
    }
    
    // Получить популярные запросы
    static async getPopularQueries(limit = 5) {
        try {
            const response = await fetch(`${this.BASE_URL}/popular?limit=${limit}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching popular queries:', error);
            throw error;
        }
    }
    
    // Получить диапазон годов
    static async getYearRange() {
        try {
            console.log('Fetching year range from:', `${this.BASE_URL}/year-range`);
            const response = await fetch(`${this.BASE_URL}/year-range`);
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Year range data received:', data);
            return data;
        } catch (error) {
            console.error('Error fetching year range:', error);
            throw error;
        }
    }
}
