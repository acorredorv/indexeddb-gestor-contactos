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