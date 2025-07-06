const form = document.getElementById('form-registro');
const lista = document.getElementById('lista-usuarios');

let usuarios = [];

// Cola para jugadores pendientes de modal
let colaModal = [];
let modalActivo = false;

// Solo ejecuta el registro y temporizador si existe el formulario (index.html)
if (form && lista) {
  // Obtener el siguiente ID incremental en formato 000001
  function getNextId() {
    let lastId = localStorage.getItem('niniland_last_id');
    let nextId = lastId ? parseInt(lastId, 10) + 1 : 1;
    localStorage.setItem('niniland_last_id', nextId.toString().padStart(6, '0'));
    return nextId.toString().padStart(6, '0');
  }

  // Guardar registro en localStorage
  function guardarRegistro(registro) {
    let registros = JSON.parse(localStorage.getItem('niniland_registros') || '[]');
    registros.push(registro);
    localStorage.setItem('niniland_registros', JSON.stringify(registros));
  }

  function guardarUsuariosEnJuego() {
    // Guarda el timestamp de inicio y el tiempo total/restante
    const usuariosAGuardar = usuarios.map(u => ({
      ...u,
      // Guarda el timestamp de cuando se creó o se agregó tiempo extra
      timestampUltimaActualizacion: u.timestampUltimaActualizacion || Date.now()
    }));
    localStorage.setItem('niniland_usuarios_en_juego', JSON.stringify(usuariosAGuardar));
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nombreNino = document.getElementById('nombre-nino').value;
    const nombrePadre = document.getElementById('nombre-padre').value;
    const cedulaPadre = document.getElementById('cedula-padre').value;
    const tiempoMin = parseInt(document.getElementById('tiempo-minutos').value);
    const tiempoSeg = tiempoMin * 60;

    const usuario = {
      id: Date.now(),
      nombreNino,
      nombrePadre,
      cedulaPadre,
      tiempoTotal: tiempoSeg,
      tiempoRestante: tiempoSeg,
      intervalo: null,
      timestampUltimaActualizacion: Date.now(),
      precioAcumulado: calcularPrecio(tiempoMin) // Nuevo campo para precio acumulado
    };

    usuarios.push(usuario);
    iniciarTemporizador(usuario);
    renderUsuarios();
    form.reset();
  });

  function iniciarTemporizador(usuario) {
    usuario.intervalo = setInterval(() => {
      if (usuario.tiempoRestante <= 1) {
        clearInterval(usuario.intervalo);
        finalizarTiempo(usuario.id, true);
      } else {
        usuario.tiempoRestante--;
        usuario.timestampUltimaActualizacion = Date.now();
        renderUsuarios();
        guardarUsuariosEnJuego();
      }
    }, 1000);
  }

  // Modal para agregar tiempo extra
  function mostrarModalAgregarTiempo(usuario, finalizarCallback) {
    const modal = document.getElementById('modal-tiempo');
    const mensaje = document.getElementById('modal-mensaje');
    const input = document.getElementById('modal-tiempo-extra');
    const btnAgregar = document.getElementById('modal-agregar');
    const btnFinalizar = document.getElementById('modal-finalizar');
    const colaDiv = document.getElementById('modal-cola');

    mensaje.textContent = `⏰ El tiempo ha terminado para ${usuario.nombreNino}. ¿Deseas agregar más tiempo?`;
    input.value = '';
    input.style.display = '';
    modal.style.display = 'flex';

    // Mostrar la cola de jugadores pendientes (excluyendo el actual)
    if (colaModal.length > 0) {
      const nombres = colaModal.map(item => item.usuario.nombreNino).join(', ');
      colaDiv.innerHTML = `<strong>En espera:</strong> ${nombres}`;
    } else {
      colaDiv.innerHTML = '';
    }

    btnAgregar.onclick = () => {
      const tiempoExtra = parseInt(input.value);
      if (!isNaN(tiempoExtra) && tiempoExtra > 0) {
        modal.style.display = 'none';
        usuario.tiempoRestante = tiempoExtra * 60;
        usuario.tiempoTotal += tiempoExtra * 60;
        usuario.timestampUltimaActualizacion = Date.now();
        // Suma el precio del tiempo extra al acumulado
        usuario.precioAcumulado = (usuario.precioAcumulado || 0) + calcularPrecio(tiempoExtra);
        iniciarTemporizador(usuario);
        renderUsuarios();
        modalActivo = false;
        procesarColaModal();
      }
    };

    btnFinalizar.onclick = () => {
      modal.style.display = 'none';
      finalizarCallback();
    };
  }

  // Finalizar tiempo manual o automático
  function finalizarTiempo(id, automatico = false) {
    const idx = usuarios.findIndex(u => u.id === id);
    if (idx !== -1) {
      const usuario = usuarios[idx];
      clearInterval(usuario.intervalo);

      if (automatico) {
        colaModal.push({ usuario, idx });
        procesarColaModal();
        return;
      }

      const tiempoJugado = Math.round((usuario.tiempoTotal - usuario.tiempoRestante) / 60);
      // Usa el precio acumulado
      const precio = usuario.precioAcumulado || calcularPrecio(tiempoJugado);
      const registro = {
        id: getNextId(),
        nombreNino: usuario.nombreNino,
        nombrePadre: usuario.nombrePadre,
        cedulaPadre: usuario.cedulaPadre,
        tiempoJugado: tiempoJugado,
        precio: precio,
        fechaHoraFinalizacion: new Date().toLocaleString()
      };
      guardarRegistro(registro);
      usuarios.splice(idx, 1); // Elimina al usuario
      guardarUsuariosEnJuego(); // Guarda el nuevo estado SIN el usuario
      renderUsuarios();
    }
  }

  // Procesa la cola de jugadores pendientes de modal
  function procesarColaModal() {
    if (modalActivo || colaModal.length === 0) return;
    modalActivo = true;
    const { usuario, idx } = colaModal.shift();
    mostrarModalAgregarTiempo(usuario, () => {
      const tiempoJugado = Math.round((usuario.tiempoTotal - usuario.tiempoRestante) / 60);
      // Al guardar registro en historial, AGREGA el precio acumulado
      const registro = {
        id: getNextId(),
        nombreNino: usuario.nombreNino,
        nombrePadre: usuario.nombrePadre,
        cedulaPadre: usuario.cedulaPadre,
        tiempoJugado: tiempoJugado,
        precio: usuario.precioAcumulado || calcularPrecio(tiempoJugado), // <-- agrega esto
        fechaHoraFinalizacion: new Date().toLocaleString()
      };
      guardarRegistro(registro);
      usuarios.splice(idx, 1); // Elimina al usuario
      guardarUsuariosEnJuego(); // Guarda el nuevo estado SIN el usuario
      renderUsuarios();
      modalActivo = false;
      procesarColaModal();
    });
  }

  window.finalizarTiempo = finalizarTiempo; // Para uso en el botón

  function renderUsuarios() {
    lista.innerHTML = '';
    usuarios.forEach(usuario => {
      const minutos = Math.ceil(usuario.tiempoRestante / 60);
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${usuario.nombreNino}</strong> (Padre: ${usuario.nombrePadre})<br>
        Tiempo restante: <span>${formatTime(usuario.tiempoRestante)}</span><br>
        <span>Precio: $${(usuario.precioAcumulado || 0).toLocaleString()} COP</span><br>
        <button class="finalizar-tiempo" onclick="finalizarTiempo(${usuario.id})">Finalizar tiempo</button>
      `;
      lista.appendChild(li);
    });
  }

  // Restaura usuarios en juego si existen
  const usuariosGuardados = JSON.parse(localStorage.getItem('niniland_usuarios_en_juego') || '[]');
  if (usuariosGuardados.length > 0) {
    usuarios = usuariosGuardados.map(u => {
      // Calcula el tiempo transcurrido desde la última actualización
      const ahora = Date.now();
      const transcurrido = Math.floor((ahora - u.timestampUltimaActualizacion) / 1000);
      const tiempoRestante = u.tiempoRestante - transcurrido;
      return {
        ...u,
        tiempoRestante: tiempoRestante > 0 ? tiempoRestante : 0,
        intervalo: null
      };
    });
    // Inicia los temporizadores solo para los que aún tienen tiempo
    usuarios.forEach(usuario => {
      if (usuario.tiempoRestante > 0) {
        iniciarTemporizador(usuario);
      } else {
        finalizarTiempo(usuario.id, true);
      }
    });
    renderUsuarios();
  }
}

// Formatea segundos a mm:ss
function formatTime(segundos) {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
}

// Renderiza el historial de jugadores
function renderHistorial(filtro = "") {
  const listaHistorial = document.getElementById('lista-historial');
  if (!listaHistorial) return; // Solo ejecuta en historial.html
  let registros = JSON.parse(localStorage.getItem('niniland_registros') || '[]');
  if (filtro) {
    registros = registros.filter(r =>
      (r.cedulaPadre || '').toLowerCase().includes(filtro.toLowerCase())
    );
  }
  listaHistorial.innerHTML = '';
  if (registros.length === 0) {
    listaHistorial.innerHTML = '<li>No hay registros.</li>';
    return;
  }
  registros.forEach(registro => {
    const precio = registro.precio ? `$${registro.precio.toLocaleString()} COP` : 'N/A';
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>ID:</strong> ${registro.id}<br>
      <strong>Niño:</strong> ${registro.nombreNino}<br>
      <strong>Padre:</strong> ${registro.nombrePadre}<br>
      <strong>Cédula:</strong> ${registro.cedulaPadre || '-'}<br>
      <strong>Tiempo jugado:</strong> ${registro.tiempoJugado} min<br>
      <strong>Precio:</strong> ${precio}<br>
      <strong>Finalizó:</strong> ${registro.fechaHoraFinalizacion}
    `;
    listaHistorial.appendChild(li);
  });
}

// Buscar en el historial
const inputBusqueda = document.getElementById('busqueda-historial');
if (inputBusqueda) {
  inputBusqueda.setAttribute('placeholder', 'Buscar por cédula...');
  inputBusqueda.addEventListener('input', function() {
    renderHistorial(this.value);
  });
  renderHistorial();
}

// Animación de emojis de control de videojuego cayendo
(function () {
  const EMOJI = "🎮";
  const emojiBg = document.querySelector('.emoji-bg');
  if (!emojiBg) return;

  function randomBetween(a, b) {
    return Math.random() * (b - a) + a;
  }

  function createEmoji() {
    const emoji = document.createElement('span');
    emoji.className = 'emoji-falling';
    emoji.textContent = EMOJI;
    emoji.style.left = `${randomBetween(0, 98)}vw`;
    emoji.style.fontSize = `${randomBetween(1.5, 2.7)}rem`;
    emoji.style.animationDuration = `${randomBetween(3.5, 7)}s`;
    emoji.style.animationDelay = `0s`;
    emoji.style.opacity = randomBetween(0.6, 0.95);
    emojiBg.appendChild(emoji);

    emoji.addEventListener('animationend', () => {
      emoji.remove();
    });
  }

  setInterval(createEmoji, 600);
  // Crea algunos al cargar
  for (let i = 0; i < 8; i++) setTimeout(createEmoji, i * 350);
})();

// Solo UNA VEZ estas funciones, NO duplicadas:
function calcularPrecio(minutos) {
  if (minutos === 60) return 25000;
  if (minutos === 30) return 15000;
  if (minutos === 15) return 10000;
  // Cálculo proporcional para otros valores
  return Math.round((minutos / 30) * 25000);
}

const tiempoInput = document.getElementById('tiempo-minutos');
const precioDiv = document.getElementById('precio-estimado');
if (tiempoInput && precioDiv) {
  tiempoInput.addEventListener('input', function() {
    const minutos = parseInt(this.value, 10);
    const precio = calcularPrecio(minutos);
    if (precio > 0) {
      precioDiv.textContent = `Precio estimado: $${precio.toLocaleString()} COP`;
    } else {
      precioDiv.textContent = '';
    }
  });
}
