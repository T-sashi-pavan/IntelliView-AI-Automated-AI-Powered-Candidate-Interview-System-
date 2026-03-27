import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardLayout({ role, title, subtitle, actions, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="page-content">
        <Topbar
          title={title}
          subtitle={subtitle}
          actions={actions}
          onMenuClick={() => setSidebarOpen(true)}
        />
        {children}
      </main>
    </div>
  );
}
