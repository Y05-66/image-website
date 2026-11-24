/**
 * 找回密码页：通过用户名 + 注册邮箱校验后重置密码（轻量方案，不依赖邮件服务）。
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout.jsx'
import { authApi } from '../api'

/** 邮箱格式校验正则。 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPassword() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  /** 提交找回密码表单。 */
  const handleSubmit = async (e) => {
    e.preventDefault()
    const name = username.trim()
    const mail = email.trim()
    if (!name) {
      setError('请输入用户名')
      return
    }
    if (!mail || !EMAIL_RE.test(mail)) {
      setError('请输入正确的邮箱')
      return
    }
    if (password.length < 6) {
      setError('新密码长度至少6位')
      return
    }
    if (password !== confirmPassword) {
      setError('两次输入的新密码不一致')
      return
    }
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(name, mail, password)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthLayout title="找回密码" subtitle="密码已重置">
        <p className="form-alert form-alert--success">密码重置成功，请使用新密码登录。</p>
        <Link to="/login" className="btn btn--primary btn--block">去登录</Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="找回密码" subtitle="验证注册信息后重置密码">
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="fp-username">用户名</label>
          <input
            id="fp-username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入用户名"
            autoFocus
            autoComplete="username"
          />
        </div>
        <div className="field">
          <label htmlFor="fp-email">注册邮箱</label>
          <input
            id="fp-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="请输入注册时填写的邮箱"
            autoComplete="email"
          />
          <div className="field-hint">需与注册时填写的邮箱一致</div>
        </div>
        <div className="field">
          <label htmlFor="fp-password">新密码</label>
          <div className="input-wrap">
            <input
              id="fp-password"
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
        </div>
        <div className="field">
          <label htmlFor="fp-confirm">确认新密码</label>
          <input
            id="fp-confirm"
            className="input"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请再次输入新密码"
            autoComplete="new-password"
          />
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
              提交中…
            </>
          ) : (
            '重置密码'
          )}
        </button>
      </form>
      <p className="auth-switch">
        想起来了？<Link to="/login">返回登录</Link>
      </p>
      <div className="forgot-fallback">
        用户名、邮箱都想不起来了？<a href="mailto:admin@example.com">联系管理员</a>为你重置密码，重置后即可登录。
      </div>
    </AuthLayout>
  )
}