export default function PublicDashboard() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Welcome to the Public Dashboard!</h1>
      <p>This dashboard is visible to everyone. High-level stats and project info can go here.</p>
      <p>
        <a href="/dashboard" style={{ color: 'blue', textDecoration: 'underline' }}>
          Go to Protected Dashboard (requires login)
        </a>
      </p>
    </div>
  );
}
