import { apiRegister, apiLogin, apiGetProfile, apiPatchUser, apiListUsers } from './api.js';
import { auth } from './state.js';

const views = {
  login: document.getElementById('view-login'),
  register: document.getElementById('view-register'),
  profile: document.getElementById('view-profile'),
  leaderboard: document.getElementById('view-leaderboard'),
};

function show(viewName) {
  Object.values(views).forEach(v => v.classList.add('hidden'));
  views[viewName].classList.remove('hidden');
}

function setMsg(id, text, ok = false) {
  const el = document.getElementById(id);
  el.textContent = text || '';
  el.style.color = ok ? 'green' : 'crimson';
}

function requireAuthOrGoLogin(targetViewIfOk = 'profile') {
  if (!auth.isAuth()) {
    show('login');
    return false;
  }
  show(targetViewIfOk);
  return true;
}

// Nav buttons
document.querySelectorAll('nav [data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    const name = btn.getAttribute('data-view');
    if (name === 'profile' || name === 'leaderboard') {
      if (!requireAuthOrGoLogin(name)) return;
      if (name === 'profile') loadProfile();
      if (name === 'leaderboard') loadLeaderboard();
    } else {
      show(name);
    }
  });
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  auth.clear();
  show('login');
});

// Registro
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setMsg('registerMsg', '');
  const fd = new FormData(e.target);
  const username = fd.get('username').trim();
  const password = fd.get('password');

  try {
    const data = await apiRegister(username, password);
    setMsg('registerMsg', `Usuario creado: ${data?.usuario?.username || username}`, true);
    // opcional: ir a login con el username precargado
  } catch (err) {
    setMsg('registerMsg', err.message);
  }
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setMsg('loginMsg', '');
  const fd = new FormData(e.target);
  const username = fd.get('username').trim();
  const password = fd.get('password');

  try {
    const { usuario, token } = await apiLogin(username, password);
    auth.username = usuario?.username || username;
    auth.token = token;
    setMsg('loginMsg', 'Login exitoso', true);
    show('profile');
    loadProfile();
  } catch (err) {
    setMsg('loginMsg', err.message);
  }
});

// Cargar perfil
async function loadProfile() {
  const box = document.getElementById('profileBox');
  const msgId = 'profileMsg';
  setMsg(msgId, '');
  box.textContent = 'Cargando...';

  try {
    const data = await apiGetProfile(auth.username, auth.token);
    const u = data?.usuario || {};
    box.innerHTML = `
      <p><strong>Usuario:</strong> ${u.username || auth.username}</p>
      <p><strong>Score:</strong> ${u.score ?? 0}</p>
      <p><strong>UID:</strong> ${u.uid ?? '-'}</p>
      <p><strong>State:</strong> ${u.state ?? '-'}</p>
    `;
    setMsg(msgId, 'Perfil cargado', true);
  } catch (err) {
    setMsg(msgId, err.message);
    if (err.status === 401) {
      auth.clear();
      show('login');
    }
  }
}

// Actualizar score
document.getElementById('scoreForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const score = Number(fd.get('score'));
  try {
    const resp = await apiPatchUser(auth.username, { score }, auth.token);
    setMsg('profileMsg', 'Score actualizado', true);
    loadProfile();
    e.target.reset();
  } catch (err) {
    setMsg('profileMsg', err.message);
    if (err.status === 401) {
      auth.clear();
      show('login');
    }
  }
});

// Leaderboard
async function loadLeaderboard() {
  const tbody = document.querySelector('#lbTable tbody');
  const limit = Number(document.getElementById('lbLimit').value || 20);
  setMsg('lbMsg', '');
  tbody.innerHTML = '<tr><td colspan="3">Cargando...</td></tr>';
  try {
    const { usuarios = [] } = await apiListUsers({ limit, skip: 0, sort: true }, auth.token);
    tbody.innerHTML = '';
    usuarios
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) // por si el backend no ordena
      .forEach((u, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i + 1}</td><td>${u.username}</td><td>${u.score ?? 0}</td>`;
        tbody.appendChild(tr);
      });
    setMsg('lbMsg', 'OK', true);
  } catch (err) {
    tbody.innerHTML = '';
    setMsg('lbMsg', err.message);
    if (err.status === 401) {
      auth.clear();
      show('login');
    }
  }
}
document.getElementById('reloadLb').addEventListener('click', () => requireAuthOrGoLogin('leaderboard') && loadLeaderboard());

// Estado inicial
if (auth.isAuth()) {
  show('profile');
  loadProfile();
} else {
  show('login');
}
