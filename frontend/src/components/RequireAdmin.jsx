/**
 * 管理员路由守卫：非管理员访问时展示 403 无权限提示页，认证初始化期间展示骨架屏。
 */
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function RequireAdmin({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="loading-center" style={{ paddingTop: 120 }}>
        <span className="skeleton" style={{ width: 200, height: 28, borderRadius: 14 }} />
      </div>
    )
  }
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="empty" style={{ paddingTop: 80, textAlign: 'center' }}>
        <h1 style={{ fontSize: 48, margin: 0, color: 'var(--text-2)' }}>403</h1>
        <p style={{ marginTop: 8 }}>你没有权限访问该页面</p>
        <Link to="/" className="btn btn--primary" style={{ marginTop: 12, display: 'inline-block' }}>
          返回首页
        </Link>
      </div>
    )
  }
  return children
}