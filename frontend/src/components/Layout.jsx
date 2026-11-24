/**
 * 主站布局：顶部导航栏 + 内容出口，包含导航高亮、用户头像与退出。
 */
import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from './Avatar.jsx'

/** 导航链接高亮样式计算。 */
const navClass = ({ isActive }) => 'nav__link' + (isActive ? ' active' : '')

/** 读取初始主题：优先本地存储，其次跟随系统偏好。 */
function getInitialTheme() {
  const saved = localStorage.getItem('theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useState(getInitialTheme)

  /** 主题变化时同步到根节点并持久化。 */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  /** 退出登录并跳转到登录页。 */
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <NavLink to="/" className="brand">二次元图库</NavLink>
          <nav className="nav">
            <NavLink to="/" end className={navClass}>发现</NavLink>
            <NavLink to="/ranking" className={navClass}>排行榜</NavLink>
            <NavLink to="/feed" className={navClass}>关注</NavLink>
            <NavLink to="/upload" className={navClass}>上传</NavLink>
            {user?.role === 'ADMIN' && (
              <NavLink to="/review" className={navClass}>审核</NavLink>
            )}
          </nav>
          <div className="header-user">
            <button
              className="btn btn--sm btn--ghost"
              onClick={toggleTheme}
              title="切换主题"
              aria-label="切换明暗主题"
            >
              {theme === 'dark' ? '亮色' : '暗色'}
            </button>
            <button
              className="header-user__me"
              onClick={() => navigate('/profile')}
              title="个人中心"
            >
              <Avatar name={user?.username} src={user?.avatar} />
            </button>
            <button className="btn btn--sm btn--ghost" onClick={handleLogout}>退出</button>
          </div>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  )
}