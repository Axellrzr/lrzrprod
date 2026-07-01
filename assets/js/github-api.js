/**
 * Petit client pour l'API "Contents" de GitHub, utilisé par l'admin pour
 * lire/écrire assets/data/content.json directement dans le dépôt, sans
 * backend ni service tiers. Documentation : https://docs.github.com/en/rest/repos/contents
 */

import { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, CONTENT_PATH } from './github-config.js';

const API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CONTENT_PATH}`;

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Vérifie que le jeton donne bien accès en écriture au dépôt configuré. */
export async function checkToken(token) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`Jeton invalide ou dépôt introuvable (${res.status})`);
  const repo = await res.json();
  if (!repo.permissions?.push) throw new Error("Ce jeton n'a pas les droits d'écriture sur le dépôt.");
}

/** Lit content.json depuis GitHub. Renvoie { data, sha }. */
export async function getContent(token) {
  const res = await fetch(`${API_BASE}?ref=${GITHUB_BRANCH}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Lecture impossible (${res.status})`);
  const file = await res.json();
  const data = JSON.parse(base64ToUtf8(file.content));
  return { data, sha: file.sha };
}

/** Écrit une nouvelle version de content.json (avec le sha précédent pour éviter les conflits). */
export async function putContent(token, data, sha, message) {
  const res = await fetch(API_BASE, {
    method: 'PUT',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: utf8ToBase64(JSON.stringify(data, null, 2)),
      sha,
      branch: GITHUB_BRANCH,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Publication impossible (${res.status})`);
  }
  return res.json();
}
