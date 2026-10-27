export default function ConfigNotice() {
  return (
    <div className="status-card">
      <h2>Firebase isn’t set up yet</h2>
      <p>
        Copy <code>.env.example</code> to <code>.env.local</code>, fill in your Firebase
        web config, then restart <code>npm run dev</code>. The README lists the console
        settings you need.
      </p>
    </div>
  );
}
