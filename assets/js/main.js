/**
 * LRZR PRODUCTION — main.js
 * Vanilla JS, chargé en tant que module ES.
 *
 * Les données (photos, catégories, vidéos) viennent du fichier statique
 * assets/data/content.json, mis à jour depuis le panneau admin (/admin/)
 * qui le publie directement dans le dépôt GitHub — voir README.md →
 * "Configurer l'admin".
 */

'use strict';

import { extractYouTubeId } from './youtube-utils.js';

const CONTENT_URL = 'assets/data/content.json';

let HERO_IMAGES = [];
let CATEGORIES = [];
let VIDEOS = [];

/* ----------------------------------------------------------------
   CHARGEMENT DES DONNÉES
   ---------------------------------------------------------------- */
async function loadContent() {
  const res = await fetch(CONTENT_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Impossible de charger ${CONTENT_URL} (${res.status})`);
  return res.json();
}

/* ----------------------------------------------------------------
   INIT
   ---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  initNav();
  initScrollReveal();
  initFooterYear();

  // Formulaire (page d'accueil) — ne dépend pas des données distantes
  if (document.getElementById('contact-form')) {
    initContactForm();
  }

  const needsContent =
    document.getElementById('hero-slides') ||
    document.getElementById('videos-grid') ||
    document.getElementById('cats-grid');

  if (!needsContent) return;

  let content;
  try {
    content = await loadContent();
  } catch (err) {
    console.error('Chargement du contenu impossible :', err);
    return;
  }
  HERO_IMAGES = content.heroImages;
  CATEGORIES = content.categories;
  VIDEOS = content.videos;

  // Page d'accueil
  if (document.getElementById('hero-slides')) {
    initHeroCarousel();
    initCatCarouselPreview();
  }

  // Page vidéos
  if (document.getElementById('videos-grid')) {
    initVideos();
  }

  // Page galerie
  if (document.getElementById('cats-grid')) {
    initGalerie();
    initLightbox();
  }
});


/* ----------------------------------------------------------------
   NAVIGATION — sticky + burger
   ---------------------------------------------------------------- */
function initNav() {
  const header  = document.querySelector('.site-header');
  const burger  = document.querySelector('.nav__burger');
  const navList = document.querySelector('.nav__links');
  const links   = document.querySelectorAll('.nav__links a');

  if (header && !header.classList.contains('scrolled')) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (burger && navList) {
    const toggle = (open) => {
      burger.classList.toggle('open', open);
      navList.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', () => toggle(!burger.classList.contains('open')));
    links.forEach(l => l.addEventListener('click', () => toggle(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
  }
}


/* ----------------------------------------------------------------
   SCROLL REVEAL
   ---------------------------------------------------------------- */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const obs = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    }),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  els.forEach(el => obs.observe(el));
}

function observeNew(container) {
  const obs = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    }),
    { threshold: 0.08 }
  );
  container.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}


/* ----------------------------------------------------------------
   HERO CAROUSEL — défilement automatique toutes les 4 secondes
   ---------------------------------------------------------------- */
function initHeroCarousel() {
  const slidesEl = document.getElementById('hero-slides');
  const dotsEl   = document.getElementById('hero-dots');
  if (!slidesEl || !HERO_IMAGES.length) return;

  let current  = 0;
  let timer    = null;
  const total  = HERO_IMAGES.length;

  // Créer les slides
  HERO_IMAGES.forEach((img, i) => {
    const slide = document.createElement('div');
    slide.className = 'hero__slide' + (i === 0 ? ' active' : '');
    slide.setAttribute('aria-hidden', i !== 0);
    slide.style.backgroundImage = `url('${escHtml(img.src)}')`;
    // Précharger les images
    const preload = new Image();
    preload.src = img.src;
    slidesEl.appendChild(slide);
  });

  // Créer les dots
  HERO_IMAGES.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'hero__dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Slide ${i + 1}`);
    dot.setAttribute('aria-selected', i === 0);
    dot.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(dot);
  });

  function goTo(index) {
    const slides = slidesEl.querySelectorAll('.hero__slide');
    const dots   = dotsEl.querySelectorAll('.hero__dot');

    slides[current].classList.remove('active');
    slides[current].setAttribute('aria-hidden', 'true');
    dots[current].classList.remove('active');
    dots[current].setAttribute('aria-selected', 'false');

    current = (index + total) % total;

    slides[current].classList.add('active');
    slides[current].setAttribute('aria-hidden', 'false');
    dots[current].classList.add('active');
    dots[current].setAttribute('aria-selected', 'true');
  }

  function next() { goTo(current + 1); }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(next, 4000);
  }

  startTimer();

  // Pause au survol
  slidesEl.addEventListener('mouseenter', () => clearInterval(timer));
  slidesEl.addEventListener('mouseleave', startTimer);
}


/* ----------------------------------------------------------------
   CAROUSEL CATÉGORIES — aperçu page d'accueil
   ---------------------------------------------------------------- */
function initCatCarouselPreview() {
  const track   = document.getElementById('cat-track');
  const prevBtn = document.querySelector('.cat-carousel__btn--prev');
  const nextBtn = document.querySelector('.cat-carousel__btn--next');
  if (!track) return;

  // Injecter les cartes catégories
  CATEGORIES.forEach(cat => {
    const card = document.createElement('a');
    card.className = 'cat-card';
    card.href = `galerie.html#${cat.id}`;
    card.setAttribute('aria-label', `Voir la catégorie ${cat.label}`);
    card.innerHTML = `
      <img src="${escHtml(cat.cover)}" alt="${escHtml(cat.coverAlt)}" loading="lazy" width="400" height="500" />
      <div class="cat-card__overlay" aria-hidden="true">
        <span class="cat-card__label">${escHtml(cat.label)}</span>
        <span class="cat-card__count">${cat.photos.length} photos</span>
      </div>
    `;
    track.appendChild(card);
  });

  // Scroll buttons
  const scrollAmt = 340;
  prevBtn?.addEventListener('click', () => { track.scrollBy({ left: -scrollAmt, behavior: 'smooth' }); });
  nextBtn?.addEventListener('click', () => { track.scrollBy({ left:  scrollAmt, behavior: 'smooth' }); });
}


/* ----------------------------------------------------------------
   PAGE GALERIE — vue catégories + vue photos
   ---------------------------------------------------------------- */
function initGalerie() {
  const catsGrid   = document.getElementById('cats-grid');
  const catsSection  = document.getElementById('galerie-cats');
  const photosSection = document.getElementById('galerie-photos');
  const photosGrid = document.getElementById('photos-grid');
  const photosTitle = document.getElementById('galerie-photos-title');
  const backBtn    = document.getElementById('back-btn');

  if (!catsGrid) return;

  // Construire la grille des catégories
  CATEGORIES.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'cat-grid-card reveal';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Ouvrir la catégorie ${cat.label}`);
    card.dataset.catId = cat.id;
    card.innerHTML = `
      <img src="${escHtml(cat.cover)}" alt="${escHtml(cat.coverAlt)}" loading="lazy" width="600" height="750" />
      <div class="cat-grid-card__overlay" aria-hidden="true">
        <span class="cat-grid-card__label">${escHtml(cat.label)}</span>
        <span class="cat-grid-card__count">${cat.photos.length} photos</span>
      </div>
    `;
    card.addEventListener('click', () => openCategory(cat));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCategory(cat); } });
    catsGrid.appendChild(card);
  });

  observeNew(catsGrid);

  // Vérifier si une catégorie est demandée via l'ancre (#portrait, etc.)
  const hash = window.location.hash.slice(1);
  if (hash) {
    const cat = CATEGORIES.find(c => c.id === hash);
    if (cat) openCategory(cat);
  }

  // Retour aux catégories
  backBtn?.addEventListener('click', showCats);

  function openCategory(cat) {
    // Mettre à jour l'URL sans recharger
    history.pushState(null, '', `#${cat.id}`);

    // Vider et remplir la grille photos
    photosGrid.innerHTML = '';
    photosTitle.textContent = cat.label;

    // Stocker les photos pour la lightbox
    window._currentPhotos = cat.photos;

    cat.photos.forEach((photo, i) => {
      const item = document.createElement('div');
      item.className = 'photo-item reveal';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `Agrandir : ${photo.alt}`);
      item.dataset.index = i;
      item.innerHTML = `
        <img src="${escHtml(photo.src)}" alt="${escHtml(photo.alt)}" loading="lazy" width="800" height="600" />
        <div class="photo-item__overlay" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </div>
      `;
      item.addEventListener('click', () => openLightbox(i));
      item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(i); } });
      photosGrid.appendChild(item);
    });

    observeNew(photosGrid);

    // Afficher la section photos, masquer catégories
    catsSection.hidden = true;
    photosSection.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showCats() {
    photosSection.hidden = true;
    catsSection.hidden = false;
    history.pushState(null, '', 'galerie.html');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Bouton retour du navigateur
  window.addEventListener('popstate', () => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const cat = CATEGORIES.find(c => c.id === hash);
      if (cat) openCategory(cat);
    } else {
      showCats();
    }
  });
}


/* ----------------------------------------------------------------
   LIGHTBOX
   ---------------------------------------------------------------- */
function initLightbox() {
  const lightbox  = document.getElementById('lightbox');
  const imgEl     = lightbox?.querySelector('.lightbox__img');
  const captionEl = lightbox?.querySelector('.lightbox__caption');
  const closeBtn  = lightbox?.querySelector('.lightbox__close');
  const prevBtn   = lightbox?.querySelector('.lightbox__prev');
  const nextBtn   = lightbox?.querySelector('.lightbox__next');

  if (!lightbox) return;

  let currentIndex = 0;

  window.openLightbox = function(index) {
    const photos = window._currentPhotos || [];
    if (!photos.length) return;
    currentIndex = Math.max(0, Math.min(index, photos.length - 1));
    imgEl.src = photos[currentIndex].src;
    imgEl.alt = photos[currentIndex].alt;
    if (captionEl) captionEl.textContent = photos[currentIndex].alt;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn?.focus();
  };

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
  }

  function navigate(dir) {
    const photos = window._currentPhotos || [];
    openLightbox((currentIndex + dir + photos.length) % photos.length);
  }

  closeBtn?.addEventListener('click', closeLightbox);
  prevBtn?.addEventListener('click', () => navigate(-1));
  nextBtn?.addEventListener('click', () => navigate(1));
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });
}


/* ----------------------------------------------------------------
   FORMULAIRE CONTACT
   ---------------------------------------------------------------- */
function initContactForm() {
  const form      = document.getElementById('contact-form');
  const submitBtn = document.getElementById('submit-btn');
  const feedback  = document.getElementById('form-feedback');
  const btnText   = submitBtn?.querySelector('.btn-text');
  const btnLoad   = submitBtn?.querySelector('.btn-loading');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    submitBtn.disabled = true;
    btnText?.setAttribute('hidden', '');
    btnLoad?.removeAttribute('hidden');
    if (feedback) { feedback.textContent = ''; feedback.className = 'form-feedback'; }

    try {
      const res  = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const data = await res.json();
      if (data.success) {
        form.reset();
        showFeedback('✓ Message envoyé ! Je vous réponds rapidement.', 'success');
      } else {
        showFeedback('✕ ' + (data.message || 'Erreur. Réessayez ou écrivez-moi directement.'), 'error');
      }
    } catch {
      showFeedback('✕ Erreur réseau. Vérifiez votre connexion.', 'error');
    } finally {
      submitBtn.disabled = false;
      btnText?.removeAttribute('hidden');
      btnLoad?.setAttribute('hidden', '');
    }
  });

  function showFeedback(msg, type) {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.className = `form-feedback ${type}`;
    feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}


/* ----------------------------------------------------------------
   FOOTER ANNÉE
   ---------------------------------------------------------------- */
function initFooterYear() {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
}


/* ----------------------------------------------------------------
   UTILITAIRE — échapper HTML
   ---------------------------------------------------------------- */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


/* ----------------------------------------------------------------
   PAGE VIDÉOS
   ---------------------------------------------------------------- */
function initVideos() {
  const grid = document.getElementById('videos-grid');
  if (!grid) return;

  renderVideos('all');

  // Filtres
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      renderVideos(btn.dataset.filter);
    });
  });

  initVideoLightbox();
}

function renderVideos(filter) {
  const grid = document.getElementById('videos-grid');
  if (!grid) return;

  const filtered = filter === 'all' ? VIDEOS : VIDEOS.filter(v => v.category === filter);

  grid.innerHTML = filtered.map(v => {
    const id = extractYouTubeId(v.youtubeId);
    const thumb = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
    const catLabel = { fpv: 'Drone FPV', pub: 'Publicité', clip: 'Clip', court: 'Court-métrage' }[v.category] || v.category;
    return `
      <div class="video-card video-card--${v.size} reveal" data-category="${v.category}">
        <div class="video-facade" data-id="${escHtml(id)}"
             role="button" tabindex="0"
             aria-label="Lire : ${escHtml(v.title)}">
          <img
            class="video-facade__thumb"
            src="${thumb}"
            alt="Vignette — ${escHtml(v.title)}"
            loading="lazy"
            width="1280" height="720"
          />
          <div class="video-facade__play" aria-hidden="true">
            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="40" cy="40" r="39" stroke="white" stroke-opacity="0.4" stroke-width="1.5"/>
              <path d="M33 28l22 12-22 12V28z" fill="white"/>
            </svg>
          </div>
        </div>
        <div class="video-card__info">
          <span class="video-card__cat">${catLabel}</span>
          <h3 class="video-card__title">${escHtml(v.title)}</h3>
        </div>
      </div>
    `;
  }).join('');

  // Scroll reveal sur les nouveaux éléments
  observeNew(grid);

  // Clic sur facade
  grid.querySelectorAll('.video-facade').forEach(facade => {
    facade.addEventListener('click', () => openVideoLightbox(facade.dataset.id));
    facade.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVideoLightbox(facade.dataset.id); }
    });
  });
}

function openVideoLightbox(id) {
  const lb = document.getElementById('video-lightbox');
  const iframe = document.getElementById('video-lightbox-iframe');
  if (!lb || !iframe) return;
  iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeVideoLightbox() {
  const lb = document.getElementById('video-lightbox');
  const iframe = document.getElementById('video-lightbox-iframe');
  if (!lb || !iframe) return;
  iframe.src = '';
  lb.hidden = true;
  document.body.style.overflow = '';
}

function initVideoLightbox() {
  const lb = document.getElementById('video-lightbox');
  const closeBtn = lb?.querySelector('.video-lightbox__close');
  if (!lb) return;
  closeBtn?.addEventListener('click', closeVideoLightbox);
  lb.addEventListener('click', e => { if (e.target === lb) closeVideoLightbox(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeVideoLightbox(); });
}
