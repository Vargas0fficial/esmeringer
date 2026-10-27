export default function Field({ label, htmlFor, hint = 'Optional', children }) {
  return (
    <div className="setup-field">
      <div className="setup-label-row">
        <label htmlFor={htmlFor}>{label}</label>
        <small>{hint}</small>
      </div>
      {children}
    </div>
  );
}
