export default function Avatar({ name = '', size = 36, mine = false }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <div
      className={`avatar ${mine ? 'mine-avatar' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}