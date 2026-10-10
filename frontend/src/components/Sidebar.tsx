
import { Library, Headphones, Settings as SettingsIcon, TreePine } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: any) => void;
}

export default function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Library', icon: Library },
    { id: 'player', label: 'Player', icon: Headphones },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 border-r border-[var(--color-sand-200)] bg-[var(--color-surface-card)] flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-[var(--color-forest-100)] text-[var(--color-forest-700)] p-2 rounded-lg">
          <TreePine size={24} />
        </div>
        <span className="font-bold text-xl tracking-tight">Tabs to Trails</span>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id || (item.id === 'dashboard' && currentView === 'setup');
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                isActive 
                  ? 'bg-[var(--color-forest-50)] text-[var(--color-forest-800)] font-medium' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-[var(--color-forest-600)]' : ''} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-6">
        <div className="bg-[var(--color-surface-bg)] rounded-xl p-4 border border-[var(--color-sand-200)]">
          <p className="text-xs text-[var(--color-text-secondary)] font-medium uppercase tracking-wider mb-1">Status</p>
          <div className="flex items-center gap-2 text-sm text-[var(--color-forest-700)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-forest-400)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--color-forest-500)]"></span>
            </span>
            Local AI Ready
          </div>
        </div>
      </div>
    </aside>
  );
}
