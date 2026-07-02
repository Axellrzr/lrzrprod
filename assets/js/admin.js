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

// Index(es) de l'élément actuellement en cours d'édition, par section (null = aucun)
let editingHeroIndex = null;
let editingCatIndex = null;
let editingPhoto = null; // { catIndex, photoIndex }
let editingVideoIndex = null;

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
  els.heroGrid.innerHTML = content.heroImages.map((img, i) => {
    if (editingHeroIndex === i) {
      return `
        <form class="admin-thumb admin-thumb--edit" data-edit-hero="${i}">
          <input type="url" class="admin-edit-input" name="src" value="${escHtml(img.src)}" placeholder="Lien de l'image" required />
          <input type="text" class="admin-edit-input" name="alt" value="${escHtml(img.alt)}" placeholder="Texte alternatif" required />
          <div class="admin-edit-actions">
            <button type="submit" class="btn btn--primary btn--small">Enregistrer</button>
            <button type="button" class="btn btn--ghost btn--small" data-cancel-hero>Annuler</button>
          </div>
        </form>
      `;
    }
    return `
      <figure class="admin-thumb">
        <img src="${escHtml(img.src)}" alt="${escHtml(img.alt)}" loading="lazy" />
        <div class="admin-thumb__actions">
          <button type="button" class="admin-thumb__edit" data-index="${i}" aria-label="Modifier">✎</button>
          <button type="button" class="admin-thumb__delete" data-index="${i}" aria-label="Supprimer">&times;</button>
        </div>
      </figure>
    `;
  }).join('') || '<p class="admin-empty">Aucune image pour le moment.</p>';

  els.heroGrid.querySelectorAll('.admin-thumb__edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      editingHeroIndex = Number(btn.dataset.index);
      renderHero();
    });
  });

  els.heroGrid.querySelectorAll('[data-cancel-hero]').forEach((btn) => {
    btn.addEventListener('click', () => {
      editingHeroIndex = null;
      renderHero();
    });
  });

  els.heroGrid.querySelectorAll('form[data-edit-hero]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const i = Number(form.dataset.editHero);
      const src = form.elements.src.value.trim();
      const alt = form.elements.alt.value.trim();
      if (!src || !alt) return;

      await withFeedback(els.dashboardFeedback, 'Publication…', async () => {
        await updateContent((data) => { data.heroImages[i] = { src, alt }; }, 'admin: modifie une image du hero');
        editingHeroIndex = null;
        renderHero();
        return '✓ Image modifiée.';
      });
    });
  });

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
        ${editingCatIndex === ci ? '' : `
          <div class="admin-category__actions">
            <button type="button" class="btn btn--ghost btn--small" data-edit-cat="${ci}">Modifier</button>
            <button type="button" class="btn btn--ghost btn--small" data-delete-cat="${ci}">Supprimer</button>
          </div>
        `}
      </summary>
      ${editingCatIndex === ci ? renderCategoryEditForm(cat, ci) : ''}
      <div class="admin-grid">
        ${cat.photos.map((photo, pi) => renderPhotoThumb(cat, ci, photo, pi)).join('') || '<p class="admin-empty">Aucune photo.</p>'}
      </div>
    </details>
  `).join('') || '<p class="admin-empty">Aucune catégorie pour le moment.</p>';

  wireCategoryHandlers();
  populatePhotoCatSelect();
}

function renderCategoryEditForm(cat, ci) {
  return `
    <form class="admin-category-edit" data-edit-cat-form="${ci}">
      <input type="text" class="admin-edit-input" name="label" value="${escHtml(cat.label)}" placeholder="Nom affiché" required />
      <input type="url" class="admin-edit-input" name="cover" value="${escHtml(cat.cover)}" placeholder="Lien de la couverture" required />
      <input type="text" class="admin-edit-input" name="coverAlt" value="${escHtml(cat.coverAlt)}" placeholder="Alt de la couverture" required />
      <div class="admin-edit-actions">
        <button type="submit" class="btn btn--primary btn--small">Enregistrer</button>
        <button type="button" class="btn btn--ghost btn--small" data-cancel-cat>Annuler</button>
      </div>
    </form>
  `;
}

function renderPhotoThumb(cat, ci, photo, pi) {
  if (editingPhoto && editingPhoto.catIndex === ci && editingPhoto.photoIndex === pi) {
    const options = content.categories
      .map((c) => `<option value="${escHtml(c.id)}" ${c.id === cat.id ? 'selected' : ''}>${escHtml(c.label)}</option>`)
      .join('');
    return `
      <form class="admin-thumb admin-thumb--edit" data-edit-photo-cat="${ci}" data-edit-photo-index="${pi}">
        <input type="url" class="admin-edit-input" name="src" value="${escHtml(photo.src)}" placeholder="Lien de la photo" required />
        <input type="text" class="admin-edit-input" name="alt" value="${escHtml(photo.alt)}" placeholder="Texte alternatif" />
        <select class="admin-edit-input" name="catId">${options}</select>
        <div class="admin-edit-actions">
          <button type="submit" class="btn btn--primary btn--small">Enregistrer</button>
          <button type="button" class="btn btn--ghost btn--small" data-cancel-photo>Annuler</button>
        </div>
      </form>
    `;
  }
  return `
    <figure class="admin-thumb">
      <img src="${escHtml(photo.src)}" alt="${escHtml(photo.alt)}" loading="lazy" />
      <div class="admin-thumb__actions">
        <button type="button" class="admin-thumb__edit" data-cat="${ci}" data-photo="${pi}" aria-label="Modifier">✎</button>
        <button type="button" class="admin-thumb__delete" data-cat="${ci}" data-photo="${pi}" aria-label="Supprimer">&times;</button>
      </div>
    </figure>
  `;
}

function wireCategoryHandlers() {
  els.categoriesList.querySelectorAll('[data-edit-cat]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      editingCatIndex = Number(btn.dataset.editCat);
      renderCategories();
    });
  });

  els.categoriesList.querySelectorAll('[data-cancel-cat]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      editingCatIndex = null;
      renderCategories();
    });
  });

  els.categoriesList.querySelectorAll('form[data-edit-cat-form]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ci = Number(form.dataset.editCatForm);
      const label = form.elements.label.value.trim();
      const cover = form.elements.cover.value.trim();
      const coverAlt = form.elements.coverAlt.value.trim();
      if (!label || !cover) return;

      await withFeedback(els.dashboardFeedback, 'Publication…', async () => {
        await updateContent((data) => {
          Object.assign(data.categories[ci], { label, cover, coverAlt });
        }, `admin: modifie la catégorie ${label}`);
        editingCatIndex = null;
        renderCategories();
        return '✓ Catégorie modifiée.';
      });
    });
  });

  els.categoriesList.querySelectorAll('[data-delete-cat]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const ci = Number(btn.dataset.deleteCat);
      const cat = content.categories[ci];
      if (!confirm(`Supprimer la catégorie "${cat.label}" et ses ${cat.photos.length} photos ?`)) return;
      await withFeedback(els.dashboardFeedback, 'Suppression…', async () => {
        await updateContent((data) => { data.categories.splice(ci, 1); }, `admin: supprime la catégorie ${cat.label}`);
        renderCategories();
        return '✓ Catégorie supprimée.';
      });
    });
  });

  els.categoriesList.querySelectorAll('.admin-thumb__edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      editingPhoto = { catIndex: Number(btn.dataset.cat), photoIndex: Number(btn.dataset.photo) };
      renderCategories();
    });
  });

  els.categoriesList.querySelectorAll('[data-cancel-photo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      editingPhoto = null;
      renderCategories();
    });
  });

  els.categoriesList.querySelectorAll('form[data-edit-photo-cat]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ci = Number(form.dataset.editPhotoCat);
      const pi = Number(form.dataset.editPhotoIndex);
      const src = form.elements.src.value.trim();
      const alt = form.elements.alt.value.trim();
      const targetCatId = form.elements.catId.value;
      if (!src) return;

      await withFeedback(els.dashboardFeedback, 'Publication…', async () => {
        await updateContent((data) => {
          const [photo] = data.categories[ci].photos.splice(pi, 1);
          const updated = { ...photo, src, alt };
          const targetCat = data.categories.find((c) => c.id === targetCatId);
          targetCat.photos.push(updated);
        }, 'admin: modifie une photo');
        editingPhoto = null;
        renderCategories();
        return '✓ Photo modifiée.';
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
  els.videosList.innerHTML = content.videos.map((v, i) => {
    if (editingVideoIndex === i) {
      return `
        <form class="admin-video-row admin-video-row--edit" data-edit-video="${i}">
          <input type="text" class="admin-edit-input" name="url" value="https://www.youtube.com/watch?v=${escHtml(v.youtubeId)}" placeholder="Lien ou ID YouTube" required />
          <input type="text" class="admin-edit-input" name="title" value="${escHtml(v.title)}" placeholder="Titre" required />
          <select class="admin-edit-input" name="category">
            <option value="fpv" ${v.category === 'fpv' ? 'selected' : ''}>Drone FPV</option>
            <option value="pub" ${v.category === 'pub' ? 'selected' : ''}>Publicité</option>
            <option value="clip" ${v.category === 'clip' ? 'selected' : ''}>Clip</option>
            <option value="court" ${v.category === 'court' ? 'selected' : ''}>Court-métrage</option>
          </select>
          <select class="admin-edit-input" name="size">
            <option value="md" ${v.size === 'md' ? 'selected' : ''}>Moyenne</option>
            <option value="lg" ${v.size === 'lg' ? 'selected' : ''}>Grande</option>
          </select>
          <div class="admin-edit-actions">
            <button type="submit" class="btn btn--primary btn--small">Enregistrer</button>
            <button type="button" class="btn btn--ghost btn--small" data-cancel-video>Annuler</button>
          </div>
        </form>
      `;
    }
    return `
      <div class="admin-video-row">
        <img src="https://img.youtube.com/vi/${escHtml(v.youtubeId)}/default.jpg" alt="" width="120" height="90" loading="lazy" />
        <div class="admin-video-row__info">
          <strong>${escHtml(v.title)}</strong>
          <span>${CAT_LABELS[v.category] || v.category} · ${v.size === 'lg' ? 'Grande' : 'Moyenne'}</span>
        </div>
        <div class="admin-video-row__actions">
          <button type="button" class="btn btn--ghost btn--small" data-edit-index="${i}">Modifier</button>
          <button type="button" class="btn btn--ghost btn--small" data-delete-index="${i}">Supprimer</button>
        </div>
      </div>
    `;
  }).join('') || '<p class="admin-empty">Aucune vidéo pour le moment.</p>';

  els.videosList.querySelectorAll('[data-edit-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      editingVideoIndex = Number(btn.dataset.editIndex);
      renderVideos();
    });
  });

  els.videosList.querySelectorAll('[data-cancel-video]').forEach((btn) => {
    btn.addEventListener('click', () => {
      editingVideoIndex = null;
      renderVideos();
    });
  });

  els.videosList.querySelectorAll('form[data-edit-video]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const i = Number(form.dataset.editVideo);
      const youtubeId = extractYouTubeId(form.elements.url.value.trim());
      const title = form.elements.title.value.trim();
      const category = form.elements.category.value;
      const size = form.elements.size.value;
      if (!youtubeId || !title) return;

      await withFeedback(els.dashboardFeedback, 'Publication…', async () => {
        await updateContent((data) => {
          data.videos[i] = { youtubeId, title, category, size };
        }, `admin: modifie la vidéo ${title}`);
        editingVideoIndex = null;
        renderVideos();
        return '✓ Vidéo modifiée.';
      });
    });
  });

  els.videosList.querySelectorAll('[data-delete-index]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const index = Number(btn.dataset.deleteIndex);
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
