export default function Avatar({ name = '', size = 36 }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
