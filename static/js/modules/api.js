// API модуль для работы с бэкендом
export class MovieAPI {
    static BASE_URL = '';
    
    // Базовый метод для запросов
    static async makeRequest(url, signal = null) {
        const response = await fetch(url, { signal });
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return await response.json();
    }
    
    // Получение всех жанров
    static async getGenres() {
        return this.makeRequest(`${this.BASE_URL}/films/genres`);
    }
    
    // Получение новых фильмов
    static async getNewMovies(limit = 10, offset = 0, signal = null) {
        return this.makeRequest(`${this.BASE_URL}/films/search/new?limit=${limit}&offset=${offset}`, signal);
    }
    
    // Поиск по ключевому слову
    static async searchByKeyword(query, limit = 10, offset = 0, signal = null) {
        const url = `${this.BASE_URL}/films/search/keyword?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;
        return this.makeRequest(url, signal);
    }
    
    // Поиск по диапазону лет
    static async searchByYearRange(yearFrom, yearTo, genreId = null, limit = 10, offset = 0, signal = null) {
        let url = `${this.BASE_URL}/films/search/year_range?year_from=${yearFrom}&year_to=${yearTo}&limit=${limit}&offset=${offset}`;
        if (genreId) {
            url += `&category_id=${genreId}`;
        }
        return this.makeRequest(url, signal);
    }
    
    // Поиск по жанру
    static async searchByGenre(genreId, limit = 10, offset = 0, signal = null) {
        const currentYear = new Date().getFullYear();
        const url = `${this.BASE_URL}/films/search/genres?category_id=${genreId}&year_from=1900&year_to=${currentYear}&limit=${limit}&offset=${offset}`;
        return this.makeRequest(url, signal);
    }
}
