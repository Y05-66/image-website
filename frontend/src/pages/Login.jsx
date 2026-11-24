/**
 * 登录页：用户名 + 密码 + 图形验证码，支持「记住我」与密码找回入口。
 */
import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AuthLayout from '../components/AuthLayout.jsx'
import { useCaptcha } from '../hooks/useCaptcha.js'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState(location.state?.username || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { captchaId, image: captchaImg, code: captchaCode, setCode: setCaptchaCode, refresh: refreshCaptcha } = useCaptcha()

  /** 提交登录表单。 */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('请输入用户名和密码')
      return
    }
    if (!captchaCode.trim()) {
      setError('请输入验证码')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(username.trim(), password, remember, captchaId, captchaCode.trim())
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
      refreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="登录" subtitle="欢迎回来，请登录你的账号">
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="login-username">用户名</label>
          <input
            id="login-username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入用户名"
            autoFocus={!location.state?.username}
            autoComplete="username"
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">密码</label>
          <div className="input-wrap">
            <input
              id="login-password"
              className="input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoFocus={!!location.state?.username}
              autoComplete="current-password"
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
        </div>
        <div className="field">
          <label htmlFor="login-captcha">验证码</label>
          <div className="captcha-row">
            <input
              id="login-captcha"
              className="input"
              value={captchaCode}
              onChange={(e) => setCaptchaCode(e.target.value.toUpperCase())}
              placeholder="不区分大小写"
              autoComplete="off"
              maxLength={4}
            />
            <button
              type="button"
              className="captcha-img"
              onClick={refreshCaptcha}
              title="点击刷新验证码"
              aria-label="刷新验证码"
            >
              {captchaImg ? <img src={captchaImg} alt="验证码" /> : '加载中…'}
            </button>
          </div>
        </div>
        <div className="auth-row">
          <label className="auth-row__remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            记住我
          </label>
          <Link to="/forgot-password" className="auth-row__link">
            忘记密码？
          </Link>
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
              登录中…
            </>
          ) : (
            '登录'
          )}
        </button>
      </form>
      <p className="auth-switch">
        还没有账号？<Link to="/register">立即注册</Link>
      </p>
    </AuthLayout>
  )
}