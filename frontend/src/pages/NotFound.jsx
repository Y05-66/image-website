/**
 * 404 页面：匹配不到任何路由时的兜底展示。
 */
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="empty" style={{ paddingTop: 120 }}>
      <h1 style={{ fontSize: 48, margin: 0 }}>404</h1>
      <p style={{ marginTop: 8 }}>页面不存在或已被移除</p>
      <Link to="/" className="btn btn--primary" style={{ marginTop: 24, display: 'inline-flex' }}>
        返回首页
      </Link>
    </div>
  )
}