/**
 * 管理员审核后台：待审核图片通过/驳回、举报处理，以及重置用户密码兜底。
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { imageApi, reportApi, userApi } from '../api/index.js'
import { useToast } from '../context/ToastContext.jsx'

export default function AdminReview() {
  const toast = useToast()
  const [tab, setTab] = useState('pending')
  const [pending, setPending] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState(null)
  const [confirmRejectId, setConfirmRejectId] = useState(null)
  const [resetUsername, setResetUsername] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  const [resetFeedback, setResetFeedback] = useState(null)

  /** 加载待审核图片。 */
  const loadPending = useCallback(() => {
    return imageApi.pending(0, 50).then((r) => setPending(r.data || []))
  }, [])

  /** 加载举报列表。 */
  const loadReports = useCallback(() => {
    return reportApi.list(0, 50).then((r) => setReports(r.data || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    setLoadError(false)
    Promise.all([loadPending(), loadReports()])
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [loadPending, loadReports, reloadKey])

  /** 审核通过图片。 */
  const approve = async (id) => {
    setBusyId(id)
    try {
      await imageApi.approve(id)
      setPending((prev) => prev.filter((img) => img.id !== id))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  /** 驳回图片（永久删除）。 */
  const reject = async (id) => {
    setConfirmRejectId(id)
  }

  /** 确认驳回。 */
  const doReject = async () => {
    const id = confirmRejectId
    if (id == null) return
    setBusyId(id)
    try {
      await imageApi.reject(id)
      setPending((prev) => prev.filter((img) => img.id !== id))
      setConfirmRejectId(null)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  /** 标记举报为已处理。 */
  const resolveReport = async (id) => {
    setBusyId(id)
    try {
      await reportApi.resolve(id)
      setReports((prev) => prev.filter((r) => r.id !== id))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  /** 管理员重置用户密码（兜底找回）。 */
  const handleResetPassword = async () => {
    const name = resetUsername.trim()
    if (!name) {
      setResetFeedback({ type: 'err', text: '请输入用户名' })
      return
    }
    if (resetNewPassword.length < 6) {
      setResetFeedback({ type: 'err', text: '新密码至少6位' })
      return
    }
    setResetBusy(true)
    setResetFeedback(null)
    try {
      await userApi.resetPassword(name, resetNewPassword)
      setResetFeedback({ type: 'ok', text: `已重置用户「${name}」的密码` })
      setResetUsername('')
      setResetNewPassword('')
    } catch (e) {
      setResetFeedback({ type: 'err', text: e.message })
    } finally {
      setResetBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-center">
        <span className="skeleton" style={{ width: 200, height: 28, borderRadius: 14 }} />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="empty" style={{ paddingTop: 40, textAlign: 'center' }}>
        <p>加载审核数据失败，请稍后重试</p>
        <button className="btn btn--primary" style={{ marginTop: 12 }} onClick={() => setReloadKey((k) => k + 1)}>
          重新加载
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="page-title">内容审核</h1>

      <div className="tabs">
        <button className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
          待审核图片{pending.length > 0 ? `（${pending.length}）` : ''}
        </button>
        <button className={`tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
          举报处理{reports.length > 0 ? `（${reports.length}）` : ''}
        </button>
        <button className={`tab ${tab === 'reset' ? 'active' : ''}`} onClick={() => setTab('reset')}>
          重置密码
        </button>
      </div>

      {tab === 'pending' && (
        <div>
          {pending.length === 0 ? (
            <div className="empty">暂无待审核图片</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {pending.map((img) => (
                <div key={img.id} className="panel" style={{ padding: 10 }}>
                  <img
                    src={img.thumbUrl || img.url}
                    alt={img.title}
                    style={{ width: '100%', aspectRatio: img.width && img.height ? `${img.width} / ${img.height}` : '4 / 3', objectFit: 'cover', borderRadius: 8, background: img.dominantColor || 'var(--border)' }}
                  />
                  <div style={{ fontWeight: 600, marginTop: 8, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {img.title}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>by {img.uploaderName}</div>
                  <div className="row" style={{ gap: 8, marginTop: 10 }}>
                    <button className="btn btn--sm btn--primary" onClick={() => approve(img.id)} disabled={busyId === img.id}>
                      通过
                    </button>
                    <button className="btn btn--sm btn--danger" onClick={() => reject(img.id)} disabled={busyId === img.id}>
                      驳回
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <div>
          {reports.length === 0 ? (
            <div className="empty">暂无待处理举报</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {reports.map((r) => (
                <div key={r.id} className="panel" style={{ margin: 0 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    图片 ID：<Link to={`/image/${r.imageId}`}>#{r.imageId}</Link>
                  </div>
                  <div className="muted" style={{ wordBreak: 'break-word' }}>
                    举报原因：{r.reason || '（未填写）'}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                    举报人 ID：{r.reporterId} · 时间：{r.createdAt ? new Date(r.createdAt).toLocaleString('zh-CN') : ''}
                  </div>
                  <button className="btn btn--sm" style={{ marginTop: 12 }} onClick={() => resolveReport(r.id)} disabled={busyId === r.id}>
                    标记已处理
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'reset' && (
        <div className="panel" style={{ maxWidth: 480, padding: 20 }}>
          <h3 style={{ margin: '0 0 4px' }}>重置用户密码</h3>
          <p className="muted" style={{ margin: '0 0 16px', fontSize: 13 }}>
            用于用户忘记密码、且无法通过邮箱找回时的兜底操作。
          </p>
          <div className="field">
            <label htmlFor="reset-username">用户名</label>
            <input
              id="reset-username"
              className="input"
              value={resetUsername}
              onChange={(e) => setResetUsername(e.target.value)}
              placeholder="请输入要重置的用户名"
            />
          </div>
          <div className="field">
            <label htmlFor="reset-password">新密码</label>
            <input
              id="reset-password"
              className="input"
              type="password"
              value={resetNewPassword}
              onChange={(e) => setResetNewPassword(e.target.value)}
              placeholder="至少6位"
            />
          </div>
          {resetFeedback && (
            <p className={`form-alert ${resetFeedback.type === 'ok' ? 'form-alert--success' : ''}`}>
              {resetFeedback.text}
            </p>
          )}
          <button className="btn btn--primary" onClick={handleResetPassword} disabled={resetBusy}>
            {resetBusy ? '重置中…' : '重置密码'}
          </button>
        </div>
      )}

      {confirmRejectId != null && (
        <div className="modal-mask" onClick={() => setConfirmRejectId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__title">驳回图片</div>
            <div style={{ marginBottom: 16 }}>确定驳回该图片吗？将被永久删除。</div>
            <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn--ghost" onClick={() => setConfirmRejectId(null)}>取消</button>
              <button className="btn btn--danger" onClick={doReject}>驳回</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}