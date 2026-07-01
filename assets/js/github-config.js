/**
 * LRZR PRODUCTION — github-config.js
 *
 * Réglages du panneau admin. Aucun service payant : l'admin publie ses
 * modifications directement dans ce dépôt GitHub (fichier
 * assets/data/content.json) via l'API GitHub, en utilisant un jeton
 * d'accès personnel que TU génères et colles dans l'écran de connexion
 * de /admin/ (le jeton reste uniquement dans ton navigateur — jamais
 * envoyé ailleurs qu'à api.github.com, jamais commité dans le dépôt).
 *
 * Voir README.md → section "Configurer l'admin" pour la marche à suivre.
 */

export const GITHUB_OWNER = 'lrzrprod';
export const GITHUB_REPO = 'lrzrprod.github.io';
export const GITHUB_BRANCH = 'main';
export const CONTENT_PATH = 'assets/data/content.json';

/**
 * Mot de passe pour ouvrir l'écran d'administration.
 * ⚠️ Ce n'est PAS une vraie protection cryptographique (le fichier est
 * visible publiquement dans le code source, comme tout JS côté client).
 * Il sert juste à écarter un visiteur curieux qui tomberait sur /admin/.
 * La vraie protection est le jeton GitHub : sans un jeton valide avec
 * accès en écriture à ce dépôt, aucune publication n'est possible, quel
 * que soit le mot de passe. Change cette valeur quand tu veux.
 */
export const ADMIN_PASSWORD = 'Lrzrprod_admin';
