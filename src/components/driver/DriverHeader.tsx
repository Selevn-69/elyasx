import { Link } from 'react-router-dom'

interface DriverHeaderProps {
  title: string
  subtitle?: string
}

export default function DriverHeader({ title, subtitle }: DriverHeaderProps) {
  const driverName = localStorage.getItem('driverName') || 'Driver'
  const initial = driverName.charAt(0).toUpperCase()

  return (
    <header className="fixed top-0 right-0 h-20 left-[240px] bg-surface dark:bg-background flex items-center justify-between px-gutter z-40 border-b border-outline-variant/10">
      <div className="flex flex-col">
        <h1 className="font-h3 text-h3 text-on-surface dark:text-on-background">{title}</h1>
        {subtitle && <p className="text-body-sm font-body-sm text-on-surface-variant">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-lg">
        <button className="relative p-sm rounded-full hover:bg-surface-container-low transition-all">
          <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
        </button>
        <Link
          to="/driver/profile"
          className="flex items-center gap-sm bg-surface-container-low px-md py-xs rounded-full border border-outline-variant/30 hover:brightness-95 transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-label-bold">
            {initial}
          </div>
          <span className="font-label-bold text-label-bold text-on-surface">{driverName}</span>
        </Link>
      </div>
    </header>
  )
}
