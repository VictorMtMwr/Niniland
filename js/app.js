const form = document.getElementById('form-registro');
const lista = document.getElementById('lista-usuarios');

let usuarios = [];

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const nombreNino = document.getElementById('nombre-nino').value;
  const nombrePadre = document.getElementById('nombre-padre').value;
  const tiempoMin = parseInt(document.getElementById('tiempo-minutos').value);
  const tiempoSeg = tiempoMin * 60;

  const usuario = {
    id: Date.now(),
    nombreNino,
    nombrePadre,
    tiempoRestante: tiempoSeg,
    intervalo: null
  };

  usuarios.push(usuario);
  iniciarTemporizador(usuario);
  renderUsuarios();

  form.reset();
});

function iniciarTemporizador(usuario) {
  usuario.intervalo = setInterval(() => {
    usuario.tiempoRestante--;

    if (usuario.tiempoRestante <= 0) {
      clearInterval(usuario.intervalo);
      alert(`⏰ El tiempo ha terminado para ${usuario.nombreNino}`);
      usuarios = usuarios.filter(u => u.id !== usuario.id);
    }

    renderUsuarios();
  }, 1000);
}

function eliminarUsuario(id) {
  const usuario = usuarios.find(u => u.id === id);
  if (usuario) clearInterval(usuario.intervalo);
  usuarios = usuarios.filter(u => u.id !== id);
  renderUsuarios();
}

function renderUsuarios() {
  lista.innerHTML = '';
  usuarios.forEach(usuario => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${usuario.nombreNino}</strong> (Padre: ${usuario.nombrePadre})<br>
      Tiempo restante: <span>${formatTime(usuario.tiempoRestante)}</span><br>
      <button onclick="eliminarUsuario(${usuario.id})">Eliminar</button>
    `;
    lista.appendChild(li);
  });
}
