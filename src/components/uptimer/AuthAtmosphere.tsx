export function AuthAtmosphere() {
  return (
    <div aria-hidden className="auth-atmosphere">
      <div className="auth-grid" />
      <div className="auth-glow" />
      <span className="auth-ring auth-ring-1" />
      <span className="auth-ring auth-ring-2" />
      <span className="auth-ring auth-ring-3" />
    </div>
  );
}

export function HeartbeatLogo() {
  return (
    <div className="auth-logo">
      <svg viewBox="0 0 100 100" className="size-[45px] overflow-visible">
        <path
          className="heartbeat-path"
          d="M5 50 H28 L36 33 L46 68 L56 22 L64 50 H95"
        />
      </svg>
    </div>
  );
}
