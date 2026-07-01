/**
 * LRZR PRODUCTION — admin.js
 * Panneau d'administration : mot de passe local + jeton d'accès GitHub,
 * puis lecture/écriture directe de assets/data/content.json dans le dépôt
 * via l'API GitHub (voir github-api.js). Pas de backend, pas de service
 * payant : juste ton dépôt GitHub, qui héberge déjà le site.
 *
 * Les photos et vidéos ne sont jamais uploadées ici : on enregistre des
 * liens (ibb.co pour les photos, YouTube pour les vidéos).
 */

'use strict';

import { ADMIN_PASSWORD } from './github-config.js';
import { checkToken, getContent, putContent } from './github-api.js';
import { extractYouTubeId } from './youtube-utils.js';

const TOKEN_KEY = 'lrzr_admin_github_token';
const AUTHED_KEY = 'lrzr_admin_authed';

const els = {
  login: document.getElementById('admin-login'),
  dashboard: document.getElementById('admin-dashboard'),
  loginForm: document.getElementById('login-form'),
  loginFeedback: document.getElementById('login-feedback'),
  logoutBtn: document.getElementById('logout-btn'),
  dashboardFeedback: document.getElementById('dashboard-feedback'),
  heroGrid: document.getElementById('hero-grid'),
  heroForm: document.getElementById('hero-form'),
  categoriesList: document.getElementById('categories-list'),
  categoryForm: document.getElementById('category-form'),
  photoForm: document.getElementById('photo-form'),
  photoCatSelect: document.getElementById('photo-cat'),
  videosList: document.getElementById('videos-list'),
  videoForm: document.getElementById('video-form'),
};

let token = null;
let content = null; // dernier contenu lu depuis GitHub
let sha = null;      // sha du fichier, requis par l'API pour écrire

init();

function init() {
  initLoginForm();
  initLogout();
  initTabs();
  initHeroForm();
  initCategoryForm();
  initPhotoForm();
  initVideoForm();

  const savedToken = localStorage.getItem(TOKEN_KEY);
  const wasAuthed = sessionStorage.getItem(AUTHED_KEY) === 'true';
  if (savedToken && wasAuthed) {
    token = savedToken;
    enterDashboard();
  }
}

/* ----------------------------------------------------------------
   CONNEXION
   ---------------------------------------------------------------- */
function initLoginForm() {
  els.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('login-password').value;
    const githubToken = document.getElementById('login-token').value.trim();

    setFeedback(els.loginFeedback, '', '');

    if (password !== ADMIN_PASSWORD) {
      setFeedback(els.loginFeedback, '✕ Mot de passe incorrect.', 'error');
      return;
    }

    setFeedback(els.loginFeedback, 'Vérification du jeton…', '');
    try {
      await checkToken(githubToken);
      token = githubToken;
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(AUTHED_KEY, 'true');
      await enterDashboard();
    } catch (err) {
      setFeedback(els.loginFeedback, '✕ ' + err.message, 'error');
    }
  });
}

function initLogout() {
  els.logoutBtn.addEventListener('click', () => {
    token = null;
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(AUTHED_KEY);
    els.dashboard.hidden = true;
    els.logoutBtn.hidden = true;
    els.login.hidden = false;
    els.loginForm.reset();
  });
}

async function enterDashboard() {
  els.login.hidden = true;
  els.logoutBtn.hidden = false;
  els.dashboard.hidden = false;
  await refreshAll();
}

/* ----------------------------------------------------------------
   TABS
   ---------------------------------------------------------------- */
function initTabs() {
  document.querySelectorAll('.admin-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      document.querySelectorAll('.admin-tabpanel').forEach((p) => { p.hidden = true; });
      document.getElementById(`tab-${btn.dataset.tab}`).hidden = false;
    });
  });
}

/* ----------------------------------------------------------------
   DONNÉES — lecture / écriture sur GitHub
   ---------------------------------------------------------------- */
async function refreshAll() {
  await withFeedback(els.dashboardFeedback, 'Chargement…', async () => {
    const result = await getContent(token);
    content = result.data;
    sha = result.sha;
    renderHero();
    renderCategories();
    renderVideos();
    return '';
  });
}

/** Applique une mutation synchrone sur le contenu local puis publie sur GitHub. */
async function updateContent(mutatorFn, message) {
  mutatorFn(content);
  const result = await putContent(token, content, sha, message);
  sha = result.content.sha;
}

/* ----------------------------------------------------------------
   HERO
   ---------------------------------------------------------------- */
function renderHero() {
  els.heroGrid.innerHTML = content.heroImages.map((img, i) => `
    <figure class="admin-thumb">
      <img src="${escHtml(img.src)}" alt="${escHtml(img.alt)}" loading="lazy" />
      <button type="button" class="admin-thumb__delete" data-index="${i}" aria-label="Supprimer">&times;</button>
    </figure>
  `).join('') || '<p class="admin-empty">Aucune image pour le moment.</p>';

  els.heroGrid.querySelectorAll('.admin-thumb__delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const index = Number(btn.dataset.index);
      if (!confirm('Supprimer cette image du hero ?')) return;
      await withFeedback(els.dashboardFeedback, 'Suppression…', async () => {
        await updateContent((data) => { data.heroImages.splice(index, 1); }, 'admin: retire une image du hero');
        renderHero();
        return '✓ Image supprimée.';
      });
    });
  });
}

function initHeroForm() {
  els.heroForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const src = document.getElementById('hero-url').value.trim();
    const alt = document.getElementById('hero-alt').value.trim();
    if (!src) return;

    await withFeedback(els.dashboardFeedback, 'Publication…', async () => {
      await updateContent((data) => { data.heroImages.push({ src, alt }); }, 'admin: ajoute une image au hero');
      renderHero();
      els.heroForm.reset();
      return '✓ Image ajoutée au hero.';
    });
  });
}

/* ----------------------------------------------------------------
   CATÉGORIES & PHOTOS
   ---------------------------------------------------------------- */
function renderCategories() {
  els.categoriesList.innerHTML = content.categories.map((cat, ci) => `
    <details class="admin-category" open>
      <summary>
        ${escHtml(cat.label)} <span class="admin-category__count">(${cat.photos.length} photos)</span>
        <button type="button" class="btn btn--ghost btn--small admin-category__delete" data-cat="${ci}">Supprimer la catégorie</button>
      </summary>
      <div class="admin-grid">
        ${cat.photos.map((photo, pi) => `
          <figure class="admin-thumb">
            <img src="${escHtml(photo.src)}" alt="${escHtml(photo.alt)}" loading="lazy" />
            <button type="button" class="admin-thumb__delete" data-cat="${ci}" data-photo="${pi}" aria-label="Supprimer">&times;</button>
          </figure>
        `).join('') || '<p class="admin-empty">Aucune photo.</p>'}
      </div>
    </details>
  `).join('') || '<p class="admin-empty">Aucune catégorie pour le moment.</p>';

  els.categoriesList.querySelectorAll('.admin-category__delete').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const ci = Number(btn.dataset.cat);
      const cat = content.categories[ci];
      if (!confirm(`Supprimer la catégorie "${cat.label}" et ses ${cat.photos.length} photos ?`)) return;
      await withFeedback(els.dashboardFeedback, 'Suppression…', async () => {
        await updateContent((data) => { data.categories.splice(ci, 1); }, `admin: supprime la catégorie ${cat.label}`);
        renderCategories();
        return '✓ Catégorie supprimée.';
      });
    });
  });

  els.categoriesList.querySelectorAll('.admin-thumb__delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ci = Number(btn.dataset.cat);
      const pi = Number(btn.dataset.photo);
      if (!confirm('Supprimer cette photo ?')) return;
      await withFeedback(els.dashboardFeedback, 'Suppression…', async () => {
        await updateContent((data) => { data.categories[ci].photos.splice(pi, 1); }, 'admin: supprime une photo');
        renderCategories();
        return '✓ Photo supprimée.';
      });
    });
  });

  populatePhotoCatSelect();
}

function populatePhotoCatSelect() {
  els.photoCatSelect.innerHTML = content.categories
    .map((cat) => `<option value="${escHtml(cat.id)}">${escHtml(cat.label)}</option>`)
    .join('');
}

function initCategoryForm() {
  els.categoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('cat-id').value.trim().toLowerCase();
    const label = document.getElementById('cat-label').value.trim();
    const cover = document.getElementById('cat-cover-url').value.trim();
    const coverAlt = document.getElementById('cat-cover-alt').value.trim();
    if (!id || !label || !cover) return;

    if (content.categories.some((c) => c.id === id)) {
      setFeedback(els.dashboardFeedback, `✕ L'identifiant "${id}" existe déjà.`, 'error');
      return;
    }

    await withFeedback(els.dashboardFeedback, 'Publication…', async () => {
      await updateContent((data) => {
        data.categories.push({ id, label, cover, coverAlt, photos: [] });
      }, `admin: crée la catégorie ${label}`);
      renderCategories();
      els.categoryForm.reset();
      return '✓ Catégorie créée.';
    });
  });
}

function initPhotoForm() {
  els.photoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const catId = els.photoCatSelect.value;
    const src = document.getElementById('photo-url').value.trim();
    const alt = document.getElementById('photo-alt').value.trim();
    if (!src || !catId) return;

    await withFeedback(els.dashboardFeedback, 'Publication…', async () => {
      await updateContent((data) => {
        const cat = data.categories.find((c) => c.id === catId);
        cat.photos.push({ src, alt });
      }, `admin: ajoute une photo à ${catId}`);
      renderCategories();
      els.photoForm.reset();
      return '✓ Photo ajoutée.';
    });
  });
}

/* ----------------------------------------------------------------
   VIDÉOS
   ---------------------------------------------------------------- */
const CAT_LABELS = { fpv: 'Drone FPV', pub: 'Publicité', clip: 'Clip', court: 'Court-métrage' };

function renderVideos() {
  els.videosList.innerHTML = content.videos.map((v, i) => `
    <div class="admin-video-row">
      <img src="https://img.youtube.com/vi/${escHtml(v.youtubeId)}/default.jpg" alt="" width="120" height="90" loading="lazy" />
      <div class="admin-video-row__info">
        <strong>${escHtml(v.title)}</strong>
        <span>${CAT_LABELS[v.category] || v.category} · ${v.size === 'lg' ? 'Grande' : 'Moyenne'}</span>
      </div>
      <button type="button" class="btn btn--ghost btn--small" data-index="${i}">Supprimer</button>
    </div>
  `).join('') || '<p class="admin-empty">Aucune vidéo pour le moment.</p>';

  els.videosList.querySelectorAll('button[data-index]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const index = Number(btn.dataset.index);
      if (!confirm('Supprimer cette vidéo ?')) return;
      await withFeedback(els.dashboardFeedback, 'Suppression…', async () => {
        await updateContent((data) => { data.videos.splice(index, 1); }, 'admin: supprime une vidéo');
        renderVideos();
        return '✓ Vidéo supprimée.';
      });
    });
  });
}

function initVideoForm() {
  els.videoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawUrl = document.getElementById('video-url').value.trim();
    const title = document.getElementById('video-title').value.trim();
    const category = document.getElementById('video-category').value;
    const size = document.getElementById('video-size').value;
    const youtubeId = extractYouTubeId(rawUrl);
    if (!youtubeId || !title) return;

    await withFeedback(els.dashboardFeedback, 'Publication…', async () => {
      await updateContent((data) => {
        data.videos.push({ youtubeId, title, category, size });
      }, `admin: ajoute la vidéo ${title}`);
      renderVideos();
      els.videoForm.reset();
      return '✓ Vidéo ajoutée.';
    });
  });
}

/* ----------------------------------------------------------------
   HELPERS
   ---------------------------------------------------------------- */
async function withFeedback(el, pendingMsg, action) {
  setFeedback(el, pendingMsg, '');
  try {
    const successMsg = await action();
    if (successMsg) setFeedback(el, successMsg, 'success');
    else setFeedback(el, '', '');
  } catch (err) {
    console.error(err);
    setFeedback(el, '✕ Une erreur est survenue : ' + (err?.message || err), 'error');
  }
}

function setFeedback(el, msg, type) {
  if (!el) return;
  el.textContent = msg;
  el.className = 'form-feedback' + (type ? ` ${type}` : '');
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
