import { NavLink, Outlet } from 'react-router-dom'
import InstallHint from './InstallHint'

const tabs = [
  { to: '/', label: 'Home', end: true },
  { to: '/log', label: 'Log' },
  { to: '/exercises', label: 'Exercises' },
  { to: '/body', label: 'Body' },
  { to: '/stats', label: 'Stats' },
]

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-base font-semibold">Gym Tracker</h1>
        <NavLink
          to="/settings"
          aria-label="Settings"
          className={({ isActive }) =>
            `text-xl leading-none ${isActive ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`
          }
        >
          ⚙︎
        </NavLink>
      </header>

      <InstallHint />

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <Outlet />
      </main>

      <nav className="grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `py-2.5 text-center text-xs font-medium ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
