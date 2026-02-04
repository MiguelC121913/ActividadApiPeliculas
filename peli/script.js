// Configuración de la API (OMDb provee datos de IMDb)
const API_KEY = '640de6cb'; // Key gratuita 
const BASE_URL = `https://www.omdbapi.com/?apikey=${API_KEY}`;

// Referencias al DOM
const movieInput = document.getElementById('movie-input');
const searchBtn = document.getElementById('search-btn');
const moviesGrid = document.getElementById('movies-grid');
const favGrid = document.getElementById('fav-grid');
const statusMsg = document.querySelector('.status-msg');

// 1. FUNCIÓN ASÍNCRONA PRINCIPAL
async function buscarPeliculas(titulo) {
    try {
        statusMsg.innerText = "Consultando base de datos...";
        
        // Forzamos HTTPS para evitar bloqueos de seguridad
        const response = await fetch(`https://www.omdbapi.com/?apikey=${API_KEY}&s=${titulo}`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data.Response === "True") {
            renderizarPeliculas(data.Search);
            statusMsg.innerText = `Resultados para: ${titulo}`;
        } else {
            // Aquí la API nos dice por qué falló (ej: "Too many results" o "Key expired")
            statusMsg.innerText = `Error de la API: ${data.Error}`;
            moviesGrid.innerHTML = "";
        }
    } catch (error) {
        console.error("Error detallado:", error);
        statusMsg.innerText = "Error: No se pudo conectar con el servidor de IMDb.";
    }
}

// 2. RENDERIZADO DE TARJETAS
function renderizarPeliculas(lista) {
    moviesGrid.innerHTML = "";
    
    lista.forEach(movie => {
        const poster = movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/350x500?text=No+Poster";
        const isFav = checarFavorito(movie.imdbID);

        moviesGrid.innerHTML += `
            <article class="movie-card">
                <img src="${poster}" alt="${movie.Title}">
                <div class="info">
                    <h3>${movie.Title}</h3>
                    <p>Año: ${movie.Year} | IMDb ID: ${movie.imdbID}</p>
                    <button class="btn-fav ${isFav ? 'active' : ''}" 
                            onclick="toggleFavorito('${movie.imdbID}', '${movie.Title.replace(/'/g, "")}', '${poster}')">
                        ${isFav ? '❤️ En mi lista' : '➕ Agregar a favoritos'}
                    </button>
                </div>
            </article>
        `;
    });
}

// 3. PERSISTENCIA CON LOCALSTORAGE (Basado en tareas previas)
function toggleFavorito(id, title, img) {
    let favs = JSON.parse(localStorage.getItem('mis_peliculas')) || [];
    const index = favs.findIndex(f => f.id === id);

    if (index > -1) {
        favs.splice(index, 1); // Quitar
    } else {
        favs.push({ id, title, img }); // Agregar
    }

    localStorage.setItem('mis_peliculas', JSON.stringify(favs));
    renderizarFavoritos();
    
    // Si la película está en el grid de búsqueda, actualizar su botón
    const query = movieInput.value;
    if(query) buscarPeliculas(query); 
}

function renderizarFavoritos() {
    const favs = JSON.parse(localStorage.getItem('mis_peliculas')) || [];
    favGrid.innerHTML = "";

    favs.forEach(f => {
        favGrid.innerHTML += `
            <article class="movie-card">
                <img src="${f.img}" alt="${f.title}">
                <div class="info">
                    <h3>${f.title}</h3>
                    <button class="btn-fav active" onclick="toggleFavorito('${f.id}')">Eliminar</button>
                </div>
            </article>
        `;
    });
}

function checarFavorito(id) {
    const favs = JSON.parse(localStorage.getItem('mis_peliculas')) || [];
    return favs.some(f => f.id === id);
}

// EVENTOS
searchBtn.addEventListener('click', () => {
    const query = movieInput.value.trim();
    if (query) buscarPeliculas(query);
});

// Permitir búsqueda con la tecla Enter
movieInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchBtn.click();
});

// Inicializar favoritos al cargar
window.onload = renderizarFavoritos;