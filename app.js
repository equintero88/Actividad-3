import { saveSession, clearSession, getToken, getUsername, isAuthenticated } from './state.js';
import { register, login, getProfile, updateData, listUsers } from './api.js';

const $ = (sel) => document.querySelector(sel);

// --- Vistas ---
function showAuth() { $('#view-auth')?.classList.remove('is-hidden'); $('#view-dashboard')?.classList.add('is-hidden'); }
function showDash() { $('#view-dashboard')?.classList.remove('is-hidden'); $('#view-auth')?.classList.add('is-hidden'); }

function switchAuthTab(which) {
  const isLogin = which === 'login';
  $('#tab-login')?.classList.toggle('is-active', isLogin);
  $('#tab-register')?.classList.toggle('is-active', !isLogin);
  $('#form-login')?.classList.toggle('is-active', isLogin);
  $('#form-register')?.classList.toggle('is-active', !isLogin);
}

// --- Perfil / UI ---
function initialsFrom(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
function renderProfile(usuario) {
  const name  = usuario?.username ?? '—';
  const score = usuario?.data?.score ?? 0;
  $('#profile-avatar').textContent  = initialsFrom(name);
  $('#profile-username').textContent= name;
  $('#profile-score').textContent   = String(score);
}

// --- Leaderboard ---
async function reloadLeaderboard() {
  try {
    const limit = Number($('#lb-limit')?.value || 20);
    const skip  = Number($('#lb-skip')?.value || 0);
    const { usuarios = [] } = await listUsers({ limit, skip, sort: true }, getToken());
    const tbody = $('#table-lb tbody');
    tbody.innerHTML = '';
    usuarios
      .sort((a,b) => (b?.data?.score ?? 0) - (a?.data?.score ?? 0))
      .forEach((u, i) => {
        const tr = document.createElement('tr');
        if (u.username === getUsername()) tr.classList.add('me');
        tr.innerHTML = `<td>${i + 1 + skip}</td><td>${u.username}</td><td>${u?.data?.score ?? 0}</td>`;
        tbody.appendChild(tr);
      });
  } catch (err) {
    console.error('Error leaderboard:', err);
  }
}

// --- Restaurar sesión ---
async function tryRestoreSession() {
  if (!isAuthenticated() || !getUsername()) {
    showAuth(); switchAuthTab('login'); return;
  }
  try {
    const res = await getProfile(getUsername(), getToken());
    const usuario = res?.usuario || res;
    renderProfile(usuario);
    showDash();
    await reloadLeaderboard();
  } catch (err) {
    console.error('No se pudo restaurar sesión:', err);
    clearSession();
    showAuth(); switchAuthTab('login');
  }
}

// --- Listeners ---
function bindAuthTabs() {
  $('#tab-login')?.addEventListener('click', () => switchAuthTab('login'));
  $('#tab-register')?.addEventListener('click', () => switchAuthTab('register'));
}

function bindForms() {
  // Registro
  $('#form-register')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const msg = $('#msg-register');
    const btn = f.querySelector('button[type="submit"]');

    const u = f.username.value.trim();
    const p = f.password.value;
    if (!u || !p) { msg.textContent = 'Completa usuario y contraseña.'; return; }

    btn.disabled = true; msg.textContent = 'Creando...';
    try {
      await register(u, p);
      msg.textContent = 'Usuario creado. Ahora inicia sesión.';
      f.reset(); switchAuthTab('login');
    } catch (err) {
      msg.textContent = err?.message || 'Error al registrar.';
    } finally { btn.disabled = false; }
  });

  // Login
  $('#form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const msg = $('#msg-login');
    const btn = f.querySelector('button[type="submit"]');

    const u = f.username.value.trim();
    const p = f.password.value;
    if (!u || !p) { msg.textContent = 'Completa usuario y contraseña.'; return; }

    btn.disabled = true; msg.textContent = 'Autenticando...';
    try {
      const { usuario, token } = await login(u, p);
      saveSession({ token, username: usuario?.username || u });
      msg.textContent = '';
      await tryRestoreSession();
    } catch (err) {
      msg.textContent = err?.message || 'No se pudo iniciar sesión.';
    } finally { btn.disabled = false; }
  });

  // Logout
  $('#btn-logout')?.addEventListener('click', () => {
    clearSession();
    document.getElementById('form-login')?.reset();
    document.getElementById('form-register')?.reset();
    showAuth(); switchAuthTab('login');
  });

  // Actualizar score
  $('#form-score')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const msg = $('#msg-score');
    const n = parseInt(f.score.value, 10);
    if (!Number.isFinite(n) || n < 0) { msg.textContent = 'Ingresa un número válido.'; return; }

    msg.textContent = 'Guardando...';
    try {
      await updateData(getUsername(), { score: n }, getToken());
      const res = await getProfile(getUsername(), getToken());
      renderProfile(res?.usuario || res);
      msg.textContent = 'Score actualizado.';
      await reloadLeaderboard();
    } catch (err) {
      msg.textContent = err?.message || 'No se pudo actualizar.';
    }
  });

  // Recargar leaderboard
  $('#btn-reload-lb')?.addEventListener('click', reloadLeaderboard);
}

// --- Init ---
function init() {
  showAuth();
  switchAuthTab('login');
  bindAuthTabs();
  bindForms();
  tryRestoreSession();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
