import { useNavigate } from 'react-router-dom'

interface TopHeaderProps {
  title: string
}

export default function TopHeader({ title }: TopHeaderProps) {
  const navigate = useNavigate()
  const name = localStorage.getItem('userName') || '?'
  const initial = name.charAt(0).toUpperCase()

  return (
    <header className="fixed top-0 right-0 h-20 left-[240px] bg-surface dark:bg-background z-40 border-b border-outline-variant/10">
      <div className="flex items-center justify-between px-gutter h-full w-full">
        <h1 className="font-h3 text-[26px] leading-tight font-semibold text-inverse-surface dark:text-on-background">{title}</h1>
        <div className="flex items-center gap-md">
          <button
            onClick={() => navigate('/notifications')}
            className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-all relative"
          >
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
          </button>
          <div
            className="h-10 w-10 rounded-full bg-[#F97316] flex items-center justify-center cursor-pointer text-white font-bold text-sm"
            onClick={() => navigate('/profile')}
          >
            {initial}
          </div>
        </div>
      </div>
    </header>
  )
}
