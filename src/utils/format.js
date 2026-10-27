export function formatTime(timestamp) {
  const date = timestamp?.toDate?.();
  return date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
}

/** Group room ids: lowercase letters, digits and dashes only (the security rules enforce this too). */
export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/, '');
}

export function roomTitle(slug) {
  const text = slug.replace(/-/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
