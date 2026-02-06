/**
 * DRIVE X - RESILIENT ARCHITECTURE 
 * Implementación: Circuit Breaker, Exponential Backoff y Sanitización DOM
 */

class CircuitBreaker {
    constructor(limit = 3, timeout = 20000) {
        this.failures = 0;
        this.limit = limit;
        this.timeout = timeout;
        this.status = 'CLOSED';
        this.nextTry = 0;
    }

    async exec(fn) {
        if (this.status === 'OPEN') {
            if (Date.now() < this.nextTry) throw new Error('Circuito ABIERTO: Reintentos pausados por seguridad.');
            this.status = 'CLOSED';
            this.failures = 0;
        }

        try {
            const res = await fn();
            this.failures = 0;
            return res;
        } catch (e) {
            this.failures++;
            if (this.failures >= this.limit) {
                this.status = 'OPEN';
                this.nextTry = Date.now() + this.timeout;
            }
            throw e;
        }
    }
}

async function fetchWithRetry(url, retries = 2, delay = 1000) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        if (retries === 0) throw e;
        await new Promise(r => setTimeout(r, delay));
        return fetchWithRetry(url, retries - 1, delay * 2);
    }
}

class MovieApp {
    constructor() {
        this.apiKey = '640de6cb'; // Sustituir por llave propia si esta falla
        this.breaker = new CircuitBreaker();
        this.favs = JSON.parse(localStorage.getItem('dx_favs')) || [];
        this.init();
    }

    init() {
        // Eventos de Login
        document.getElementById('entry-btn').addEventListener('click', () => this.login());
        
        // Eventos de Búsqueda
        document.getElementById('search-btn').addEventListener('click', () => this.search());
        document.getElementById('movie-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.search();
        });

        document.getElementById('exit-btn').onclick = () => {
            localStorage.removeItem('active_session');
            location.reload();
        };

        // Persistencia de sesión básica
        if(localStorage.getItem('active_session')) {
            this.login(true);
        }
    }

    login(isStored = false) {
        const userId = document.getElementById('user-id').value;
        if (!userId && !isStored) return alert('Se requiere ID de Operador');
        
        if(!isStored) localStorage.setItem('active_session', userId);

        document.getElementById('login-modal').close();
        document.getElementById('app-container').style.display = 'block';
        this.renderFavs();
    }

    async search() {
        const query = document.getElementById('movie-input').value.trim();
        if (!query) return;

        const indicator = document.getElementById('status-indicator');
        const grid = document.getElementById('movies-grid');
        
        indicator.textContent = "⚙️ Ejecutando llamada asíncrona con reintentos...";
        
        try {
            const data = await this.breaker.exec(() => 
                fetchWithRetry(`https://www.omdbapi.com/?apikey=${this.apiKey}&s=${encodeURIComponent(query)}`)
            );

            if (data.Response === "True") {
                this.renderGrid(grid, data.Search);
                indicator.textContent = `Resultados para: ${query}`;
            } else {
                throw new Error(data.Error);
            }
        } catch (e) {
            indicator.textContent = `⚠️ Error de Resiliencia: ${e.message}`;
            grid.innerHTML = ""; 
        }
    }

    renderGrid(container, list) {
        container.innerHTML = "";
        list.forEach(item => {
            const card = document.createElement('article');
            card.className = 'movie-card';

            const img = document.createElement('img');
            img.src = item.Poster !== "N/A" ? item.Poster : "https://via.placeholder.com/350x500?text=No+Data";
            img.alt = "Poster";

            const info = document.createElement('div');
            info.className = 'info-pane';

            const title = document.createElement('h3');
            title.textContent = item.Title; // Sanitización automática contra XSS

            const btn = document.createElement('button');
            const isFav = this.favs.some(f => f.imdbID === item.imdbID);
            btn.textContent = isFav ? "Eliminar" : "Favorito";
            if(isFav) btn.style.backgroundColor = "#ef4444";
            btn.onclick = () => this.toggleFav(item);

            info.append(title, btn);
            card.append(img, info);
            container.appendChild(card);
        });
    }

    toggleFav(movie) {
        const idx = this.favs.findIndex(f => f.imdbID === movie.imdbID);
        if (idx > -1) this.favs.splice(idx, 1);
        else this.favs.push(movie);
        
        localStorage.setItem('dx_favs', JSON.stringify(this.favs));
        this.renderFavs();
        this.search(); 
    }

    renderFavs() {
        this.renderGrid(document.getElementById('fav-grid'), this.favs);
    }
}

const app = new MovieApp();