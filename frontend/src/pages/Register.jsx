/**
 * 注册页：用户名 + 密码 + 邮箱（邮箱为必填，用于找回密码）。
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AuthLayout from '../components/AuthLayout.jsx'

/** 邮箱格式校验正则。 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 计算密码强度（0-3 级）。 */
function calcStrength(pw) {
  if (!pw) return { score: 0, label: '' }
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Za-z]/.test(pw) && /[0-9]/.test(pw)) score++
  const labels = ['', '较弱', '一般', '较强']
  const level = Math.min(score, 3)
  return { score: level, label: level > 0 ? labels[level] : '至少6位字符' }
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = calcStrength(password)

  /** 提交注册表单。 */
  const handleSubmit = async (e) => {
    e.preventDefault()
    const name = username.trim()
    if (!name) {
      setError('请输入用户名')
      return
    }
    if (name.length < 2 || name.length > 50) {
      setError('用户名长度需在 2-50 个字符之间')
      return
    }
    if (password.length < 6) {
      setError('密码长度至少6位')
      return
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }
    const mail = email.trim()
    if (!mail) {
      setError('请输入邮箱，用于找回密码')
      return
    }
    if (!EMAIL_RE.test(mail)) {
      setError('邮箱格式不正确')
      return
    }
    setError('')
    setLoading(true)
    try {
      await register(name, password, mail)
      navigate('/login', { state: { username: name }, replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="注册" subtitle="创建一个账号，开始收藏与分享">
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="reg-username">用户名</label>
          <input
            id="reg-username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入用户名"
            autoFocus
            autoComplete="username"
          />
          <div className="field-hint">2-50 个字符</div>
        </div>
        <div className="field">
          <label htmlFor="reg-password">密码</label>
          <div className="input-wrap">
            <input
              id="reg-password"
              className="input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少6位字符"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
            >
              {showPassword ? '隐藏' : '显示'}
            </button>
          </div>
          {password && (
            <div className={`password-strength password-strength--${strength.score}`}>
              <div className="password-strength__bars">
                <span className={`password-strength__bar ${strength.score >= 1 ? 'filled' : ''}`} />
                <span className={`password-strength__bar ${strength.score >= 2 ? 'filled' : ''}`} />
                <span className={`password-strength__bar ${strength.score >= 3 ? 'filled' : ''}`} />
              </div>
              <div className="password-strength__label">密码强度：{strength.label}</div>
            </div>
          )}
        </div>
        <div className="field">
          <label htmlFor="reg-confirm">确认密码</label>
          <input
            id="reg-confirm"
            className="input"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请再次输入密码"
            autoComplete="new-password"
          />
        </div>
        <div className="field">
          <label htmlFor="reg-email">邮箱</label>
          <input
            id="reg-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="如 example@mail.com"
            autoComplete="email"
          />
          <div className="field-hint">用于找回密码，请务必填写正确</div>
        </div>
        {error && (
          <p className="form-alert" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn--primary btn--block" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              注册中…
            </>
          ) : (
            '注册'
          )}
        </button>
      </form>
      <p className="auth-switch">
        已有账号？<Link to="/login">去登录</Link>
      </p>
    </AuthLayout>
  )
}