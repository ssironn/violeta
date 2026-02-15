import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export function AppShell() {
  return (
    <div className="min-h-screen bg-surface-bg">
      <Navbar />
      <Outlet />
    </div>
  )
}
