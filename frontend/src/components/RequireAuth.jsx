/**
 * 路由守卫：未登录时重定向到登录页，并记录来源路径以便登录后跳回。
 * 认证初始化期间展示骨架屏，避免白屏。
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="loading-center" style={{ paddingTop: 120 }}>
        <span className="skeleton" style={{ width: 200, height: 28, borderRadius: 14 }} />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}