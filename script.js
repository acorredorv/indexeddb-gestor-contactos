let db;

// 1. Abrir/Crear la base de datos
const request = indexedDB.open('ContactosDB', 1);

request.onerror = (event) => {
    console.error("Error al abrir la BD:", event.target.error);
};

request.onupgradeneeded = (event) => {
    db = event.target.result;
    // Crear el almacén de objetos 'contactos' con id autoincremental 
    const store = db.createObjectStore('contactos', { keyPath: 'id', autoIncrement: true });
    
    // Crear índices requeridos [cite: 8, 21]
    store.createIndex('name', 'name', { unique: false });
    store.createIndex('email', 'email', { unique: true });
};

request.onsuccess = (event) => {
    db = event.target.result;
    console.log("BD abierta con éxito");
    loadContacts(); // Cargar lista al iniciar
};

// Referencias al DOM
const form = document.getElementById('contactForm');
const list = document.getElementById('contactsList');

// 2. Guardar contacto (Alta/Edición)
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const id = document.getElementById('contactId').value;

    const contact = { name, email, phone };
    // Si hay ID es una edición, si no, es nuevo (el ID lo pone IndexedDB)
    if (id) contact.id = parseInt(id);

    const transaction = db.transaction(['contactos'], 'readwrite');
    const store = transaction.objectStore('contactos');
    
    // put sirve para añadir o actualizar si ya existe la clave
    const request = store.put(contact);

    request.onsuccess = () => {
        form.reset();
        document.getElementById('contactId').value = '';
        loadContacts();
    };

    request.onerror = (e) => {
        alert("Error: Probablemente el email ya existe.");
    };
});

// 3. Cargar contactos (Render del listado) 
function loadContacts() {
    list.innerHTML = '';
    const transaction = db.transaction(['contactos'], 'readonly');
    const store = transaction.objectStore('contactos');
    const request = store.getAll();

    request.onsuccess = () => {
        const contacts = request.result;
        contacts.forEach(c => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span><strong>${c.name}</strong> (${c.email})</span>
                <div class="actions">
                    <button class="edit-btn" onclick="editContact(${c.id})">Editar</button>
                    <button class="delete-btn" onclick="deleteContact(${c.id})">Eliminar</button>
                </div>
            `;
            list.appendChild(li);
        });
    };
}

// 4. Eliminar contacto
window.deleteContact = (id) => {
    if(confirm("¿Seguro que quieres borrarlo?")) {
        const transaction = db.transaction(['contactos'], 'readwrite');
        transaction.objectStore('contactos').delete(id);
        transaction.oncomplete = () => loadContacts();
    }
};

// 5. Preparar formulario para editar
window.editContact = (id) => {
    const transaction = db.transaction(['contactos'], 'readonly');
    const store = transaction.objectStore('contactos');
    const request = store.get(id);

    request.onsuccess = () => {
        const c = request.result;
        document.getElementById('name').value = c.name;
        document.getElementById('email').value = c.email;
        document.getElementById('phone').value = c.phone || '';
        document.getElementById('contactId').value = c.id;
    };
};


// TAREA A: Búsqueda por nombre


const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');

// 1. Escuchar el evento cuando el usuario escribe
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim(); // Texto escrito
    searchByName(query);
});

// 2. Botón limpiar
clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    loadContacts(); // Recarga todos
});

// 3. Función principal de búsqueda
function searchByName(query) {
    // Si la caja está vacía, cargamos todos los contactos [cite: 89]
    if (!query) {
        loadContacts();
        return;
    }

    const list = document.getElementById('contactsList');
    list.innerHTML = ''; // Limpiar la lista actual

    // Abrir transacción de solo lectura [cite: 28, 90]
    const transaction = db.transaction(['contactos'], 'readonly');
    const store = transaction.objectStore('contactos');
    const index = store.index('name'); // Usamos el índice 'name' [cite: 25, 90]

    // Obtenemos todos los registros ordenados por nombre
    const request = index.getAll();

    request.onsuccess = () => {
        const contacts = request.result;
        
        // Filtramos en memoria los que coincidan con la búsqueda (mayúsculas/minúsculas) [cite: 29]
        const filtered = contacts.filter(c => 
            c.name.toLowerCase().includes(query.toLowerCase())
        );

        // Renderizamos (dibujamos) los resultados filtrados [cite: 30]
        if (filtered.length === 0) {
            list.innerHTML = '<li>No se encontraron coincidencias.</li>';
        } else {
            filtered.forEach(c => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span><strong>${c.name}</strong> (${c.email})</span>
                    <div class="actions">
                        <button class="edit-btn" onclick="editContact(${c.id})">Editar</button>
                        <button class="delete-btn" onclick="deleteContact(${c.id})">Eliminar</button>
                    </div>
                `;
                list.appendChild(li);
            });
        }
    };
}




//ACTUALIZACION NOELIA 

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const fileInput = document.getElementById('fileInput');

// --- 1. EXPORTAR ---
exportBtn.addEventListener('click', () => {
    const transaction = db.transaction(['contactos'], 'readonly');
    const store = transaction.objectStore('contactos');
    const request = store.getAll(); // Leer todos los contactos [cite: 23, 41]

    request.onsuccess = () => {
        const contacts = request.result;
        // Crear archivo JSON
        const blob = new Blob([JSON.stringify(contacts, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Forzar descarga
        const a = document.createElement('a');
        a.href = url;
        // Nombre del archivo con fecha (ej: contacts-2023-10-05.json)
        a.download = `contacts-${new Date().toISOString().slice(0,10)}.json`; 
        a.click();
        
        URL.revokeObjectURL(url);
    };
});

// --- 2. IMPORTAR ---
// Al pulsar el botón, simulamos click en el input oculto
importBtn.addEventListener('click', () => fileInput.click());

// Cuando se selecciona un archivo
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const contacts = JSON.parse(event.target.result); // [cite: 24, 43]
            importContactsToDB(contacts);
        } catch (err) {
            alert("Error al leer el JSON: " + err);
        }
    };
    reader.readAsText(file);
    // Limpiar el input para permitir cargar el mismo archivo dos veces si se desea
    e.target.value = ''; 
});

function importContactsToDB(contacts) {
    const transaction = db.transaction(['contactos'], 'readwrite');
    const store = transaction.objectStore('contactos');
    const emailIndex = store.index('email'); // Usamos índice email para verificar duplicados [cite: 27, 43]

    let addedCount = 0;
    let updatedCount = 0;

    contacts.forEach(contact => {
        // Validación básica
        if (!contact.name || !contact.email) return;

        // Verificar si el email ya existe
        const request = emailIndex.get(contact.email);

        request.onsuccess = () => {
            const existingContact = request.result;

            if (existingContact) {
                // Si existe, actualizamos (mantenemos el ID original para no crear uno nuevo)
                contact.id = existingContact.id;
                store.put(contact); // put actualiza [cite: 43]
                updatedCount++;
            } else {
                // Si no existe, borramos el ID (si trae uno) para que IndexedDB genere uno nuevo
                delete contact.id;
                store.add(contact); // add inserta [cite: 43]
                addedCount++;
            }
        };
    });

    transaction.oncomplete = () => {
        alert(`Importación completada.\nNuevos: ${addedCount}\nActualizados: ${updatedCount}`);
        loadContacts(); // Recargar la lista visualmente [cite: 26, 44]
    };
    
    transaction.onerror = (e) => {
        console.error("Error en importación:", e.target.error);
        alert("Hubo un error al importar los datos.");
    };
}