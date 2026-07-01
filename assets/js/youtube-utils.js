/**
 * Extrait un ID YouTube nu depuis un ID déjà propre ou une URL
 * (watch?v=, youtu.be/, embed/, shorts/). Partagé entre main.js et admin.js.
 */
export function extractYouTubeId(input) {
  if (!input) return '';
  const str = String(input).trim();
  const match = str.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([\w-]{11})/);
  if (match) return match[1];
  // Déjà un ID nu (ou format inconnu) — on le renvoie tel quel
  return str;
}
