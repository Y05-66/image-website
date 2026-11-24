/**
 * 图片详情页：图片大图展示、点赞/收藏/下载/举报、编辑与删除、
 * 评论区、作者关注、相关图片推荐。
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { imageApi, commentApi, boardApi, followApi, reportApi, userApi, downloadImage } from '../api/index.js'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext.jsx'
import { CATEGORIES, categoryLabel, categoryColor } from '../constants.js'
import Avatar from '../components/Avatar.jsx'
import ImageGrid from '../components/ImageGrid.jsx'

/** 将时间戳或日期字符串格式化为本地时间。 */
function formatDate(value) {
  if (!value) return ''
  const d = typeof value === 'number' ? new Date(value) : new Date(value)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('zh-CN')
}

export default function ImageDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const isAdmin = user?.role === 'ADMIN'

  const [image, setImage] = useState(null)
  const [related, setRelated] = useState([])
  const [comments, setComments] = useState([])
  const [commentPage, setCommentPage] = useState(0)
  const [commentTotalPages, setCommentTotalPages] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [imgError, setImgError] = useState(false)

  // 编辑态
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '', category: '', tags: '' })

  // 作者关注
  const [authorId, setAuthorId] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)

  // 收藏夹
  const [boards, setBoards] = useState([])
  const [boardOpen, setBoardOpen] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')

  // 举报
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')

  // 删除确认弹窗
  const [confirmDelete, setConfirmDelete] = useState(false)

  /** 加载图片详情、相关图片与评论（并发请求）。 */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [imgRes, relRes, comRes] = await Promise.all([
        imageApi.get(id),
        imageApi.related(id, 8),
        commentApi.list(id, 0, 20),
      ])
      setImage(imgRes.data)
      setRelated(relRes.data || [])
      setComments(comRes.data || [])
      setCommentPage(0)
      setCommentTotalPages(comRes.totalPages || 0)
      setError('')
    } catch (e) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
    boardApi.list().then((r) => setBoards(r.data || [])).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // 解析作者 userId（管理员可直接拿到，普通用户按用户名解析）
  useEffect(() => {
    if (!image || !user) return
    if (image.isOwner) {
      setAuthorId(null)
      return
    }
    if (image.uploaderId) {
      setAuthorId(image.uploaderId)
      return
    }
    if (image.uploaderName && image.uploaderName !== '匿名') {
      userApi
        .findByUsername(image.uploaderName)
        .then((r) => setAuthorId(r.data.id))
        .catch(() => setAuthorId(null))
    }
  }, [image, user])

  // 查询是否已关注
  useEffect(() => {
    if (!authorId) return
    followApi
      .status(authorId)
      .then((r) => setIsFollowing(r.data.isFollowing))
      .catch(() => {})
  }, [authorId])

  // 切换图片时重置大图加载失败状态
  useEffect(() => {
    setImgError(false)
  }, [image?.url])

  if (loading) {
    return (
      <div className="loading-center">
        <span className="skeleton" style={{ width: 200, height: 28, borderRadius: 14 }} />
      </div>
    )
  }

  if (error || !image) {
    return <div className="empty">{error || '图片不存在'}</div>
  }

  /** 局部更新图片状态。 */
  const update = (patch) => setImage((prev) => ({ ...prev, ...patch }))

  /** 点赞/取消点赞。 */
  const handleLike = async () => {
    if (busy) return
    setBusy(true)
    try {
      const d = await imageApi.like(image.id)
      update({ likeCount: d.data.likeCount, isLiked: d.data.isLiked })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  /** 收藏/取消收藏。 */
  const handleFavorite = async () => {
    if (busy) return
    setBusy(true)
    try {
      const d = await imageApi.favorite(image.id)
      update({ isFavorite: d.data.isFavorite, favoriteCount: d.data.favorites })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  /** 下载图片文件。 */
  const handleDownload = async () => {
    try {
      const filename = image.objectKey?.split('/').pop() || `image-${image.id}.${image.format || 'jpg'}`
      await downloadImage(image.id, filename)
    } catch (e) {
      toast.error(e.message)
    }
  }

  /** 进入编辑态并回填表单。 */
  const startEdit = () => {
    setEditForm({
      title: image.title || '',
      description: image.description || '',
      category: image.category || '',
      tags: (image.tags || []).join('、'),
    })
    setEditing(true)
  }

  /** 保存图片元信息与标签。 */
  const saveEdit = async () => {
    if (!editForm.title.trim()) {
      toast.error('标题不能为空')
      return
    }
    try {
      await imageApi.updateMeta(image.id, {
        title: editForm.title.trim(),
        description: editForm.description,
        category: editForm.category,
      })
      const tags = editForm.tags.split(/[、,，\s]+/).map((t) => t.trim()).filter(Boolean)
      if (tags.length) await imageApi.updateTags(image.id, tags)
      setEditing(false)
      await load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  /** 删除图片（仅管理员，经二次确认）。 */
  const handleDelete = async () => {
    try {
      await imageApi.remove(image.id)
      setConfirmDelete(false)
      navigate('/')
    } catch (e) {
      toast.error(e.message)
    }
  }

  /** 关注/取消关注作者。 */
  const handleFollow = async () => {
    if (!authorId || followBusy) return
    setFollowBusy(true)
    try {
      const r = isFollowing ? await followApi.unfollow(authorId) : await followApi.follow(authorId)
      setIsFollowing(r.data.isFollowing)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setFollowBusy(false)
    }
  }

  /** 发表评论。 */
  const submitComment = async () => {
    if (!newComment.trim() || commentBusy) return
    setCommentBusy(true)
    try {
      const d = await commentApi.create(image.id, newComment.trim())
      setComments((prev) => [d.data, ...prev])
      setNewComment('')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setCommentBusy(false)
    }
  }

  /** 加载更多评论。 */
  const loadMoreComments = async () => {
    const next = commentPage + 1
    try {
      const d = await commentApi.list(image.id, next, 20)
      setComments((prev) => [...prev, ...(d.data || [])])
      setCommentPage(next)
      setCommentTotalPages(d.totalPages || 0)
    } catch (e) {
      toast.error(e.message)
    }
  }

  /** 删除评论。 */
  const deleteComment = async (commentId) => {
    try {
      await commentApi.remove(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (e) {
      toast.error(e.message)
    }
  }

  /** 将图片加入指定收藏夹。 */
  const addToBoard = async (boardId) => {
    try {
      await boardApi.addImage(boardId, image.id)
      toast.success('已收藏到该收藏夹')
    } catch (e) {
      toast.error(e.message)
    }
  }

  /** 新建收藏夹并加入当前图片。 */
  const createBoardAndAdd = async () => {
    if (!newBoardName.trim()) return
    try {
      const d = await boardApi.create(newBoardName.trim())
      await boardApi.addImage(d.data.id, image.id)
      setBoards((prev) => [d.data, ...prev])
      setNewBoardName('')
      toast.success('已创建收藏夹并收藏')
    } catch (e) {
      toast.error(e.message)
    }
  }

  /** 提交举报。 */
  const submitReport = async () => {
    if (!reportReason.trim()) {
      toast.error('请填写举报原因')
      return
    }
    try {
      await reportApi.create(image.id, reportReason.trim())
      setReportOpen(false)
      setReportReason('')
      toast.success('举报已提交，感谢您的反馈')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const canEdit = image.isOwner || isAdmin

  return (
    <div>
      <button className="nav-btn nav-btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        ← 返回
      </button>

      <div className="detail">
        <div className="detail__main">
          <div className="detail__image" style={{ background: image.dominantColor || 'var(--surface)' }}>
            {imgError ? (
              <div className="img-error" style={{ padding: '60px 20px' }}>
                <span>图片加载失败</span>
                <button className="btn btn--sm btn--outline" style={{ marginTop: 8 }} onClick={() => setImgError(false)}>
                  重试
                </button>
              </div>
            ) : (
              <img
                src={image.url}
                alt={image.title || ''}
                style={{ aspectRatio: image.width && image.height ? `${image.width} / ${image.height}` : undefined }}
                onError={() => setImgError(true)}
              />
            )}
          </div>

          <div className="row" style={{ gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button className={`btn ${image.isLiked ? 'btn--primary' : 'btn--outline'}`} onClick={handleLike}>
              ♥ 喜欢{image.likeCount > 0 ? ` ${image.likeCount}` : ''}
            </button>
            <button className={`btn ${image.isFavorite ? 'btn--primary' : 'btn--outline'}`} onClick={handleFavorite}>
              ★ {image.isFavorite ? '已收藏' : '收藏'}{image.favoriteCount > 0 ? ` ${image.favoriteCount}` : ''}
            </button>
            <button className="btn btn--outline" onClick={() => setBoardOpen(!boardOpen)}>▣ 收藏夹</button>
            <button className="btn btn--outline" onClick={handleDownload}>⬇ 下载</button>
            <button className="btn btn--outline" onClick={() => setReportOpen(true)}>⚑ 举报</button>
            {canEdit && !editing && (
              <button className="btn btn--outline" onClick={startEdit}>✎ 编辑</button>
            )}
            {isAdmin && (
              <button className="btn btn--danger" onClick={() => setConfirmDelete(true)}>删除</button>
            )}
          </div>

          {boardOpen && (
            <div className="panel" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>选择收藏夹</div>
              {boards.map((b) => (
                <div key={b.id} className="row" style={{ justifyContent: 'space-between', padding: '6px 0' }}>
                  <span>{b.name}{b.imageCount > 0 ? `（${b.imageCount}）` : ''}</span>
                  <button className="btn btn--sm btn--ghost" onClick={() => addToBoard(b.id)}>加入</button>
                </div>
              ))}
              {boards.length === 0 && <div className="muted">还没有收藏夹</div>}
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <input
                  className="input"
                  placeholder="新建收藏夹名称"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                />
                <button className="btn btn--sm" onClick={createBoardAndAdd}>新建并加入</button>
              </div>
            </div>
          )}

          {editing ? (
            <div className="panel" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>编辑图片信息</div>
              <input
                className="input"
                placeholder="标题"
                value={editForm.title}
                maxLength={50}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                style={{ marginBottom: 8 }}
              />
              <select
                className="select"
                value={editForm.category}
                onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                style={{ marginBottom: 8 }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <textarea
                className="input"
                placeholder="描述"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                style={{ marginBottom: 8, resize: 'vertical' }}
              />
              <input
                className="input"
                placeholder="标签（用顿号或逗号分隔）"
                value={editForm.tags}
                onChange={(e) => setEditForm((p) => ({ ...p, tags: e.target.value }))}
                style={{ marginBottom: 12 }}
              />
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn--primary" onClick={saveEdit}>保存</button>
                <button className="btn btn--ghost" onClick={() => setEditing(false)}>取消</button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="detail__title">{image.title}</h1>
              {image.description && <p className="detail__desc">{image.description}</p>}
            </>
          )}

          <div className="panel" style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>评论{comments.length > 0 ? `（${comments.length}）` : ''}</div>
            <div className="row" style={{ gap: 8, marginBottom: 12 }}>
              <input
                className="input"
                placeholder="写下你的评论…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              />
              <button className="btn" onClick={submitComment} disabled={commentBusy || !newComment.trim()}>
                {commentBusy ? '发表中…' : '发表'}
              </button>
            </div>
            {comments.map((c) => (
              <div key={c.id} className="comment">
                <Avatar name={c.username} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <strong>{c.username}</strong>
                    <span className="muted" style={{ fontSize: 12 }}>{formatDate(c.createdAt)}</span>
                    {c.isOwner && <span className="tag">作者</span>}
                  </div>
                  <div style={{ marginTop: 2, wordBreak: 'break-word' }}>{c.content}</div>
                </div>
                {(c.isOwner || isAdmin) && (
                  <button className="btn btn--sm btn--ghost" onClick={() => deleteComment(c.id)}>删除</button>
                )}
              </div>
            ))}
            {comments.length === 0 && <div className="muted">还没有评论，快来抢沙发</div>}
            {commentPage + 1 < commentTotalPages && (
              <button className="btn btn--sm btn--ghost" style={{ marginTop: 8 }} onClick={loadMoreComments}>
                查看更多评论
              </button>
            )}
          </div>
        </div>

        <div className="detail__side">
          <div className="panel">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="row" style={{ gap: 8 }}>
                <Avatar name={image.uploaderName} />
                <div>
                  <div style={{ fontWeight: 600 }}>{image.uploaderName}</div>
                  <div className="muted" style={{ fontSize: 12 }}>上传者</div>
                </div>
              </div>
              {!image.isOwner && authorId && (
                <button
                  className={`btn btn--sm ${isFollowing ? 'btn--ghost' : 'btn--primary'}`}
                  onClick={handleFollow}
                  disabled={followBusy}
                >
                  {isFollowing ? '已关注' : '+ 关注'}
                </button>
              )}
            </div>
          </div>

          <div className="panel">
            <div style={{ fontWeight: 600, marginBottom: 8 }}>图片信息</div>
            <dl className="meta-list">
              <div>
                <dt>类型</dt>
                <dd>
                  {image.category ? (
                    <span className="tag" style={{ background: `${categoryColor(image.category)}22`, color: categoryColor(image.category) }}>
                      {categoryLabel(image.category)}
                    </span>
                  ) : '—'}
                </dd>
              </div>
              <div><dt>尺寸</dt><dd>{image.width && image.height ? `${image.width} × ${image.height}` : '—'}</dd></div>
              <div><dt>格式</dt><dd>{(image.format || '').toUpperCase()}</dd></div>
              <div><dt>浏览</dt><dd>{image.views > 0 ? image.views : '—'}</dd></div>
              <div><dt>下载</dt><dd>{image.downloadCount > 0 ? image.downloadCount : '—'}</dd></div>
              <div><dt>上传时间</dt><dd>{formatDate(image.createdAt)}</dd></div>
            </dl>
            {(image.tags || []).length > 0 && (
              <div className="chips" style={{ marginTop: 8 }}>
                {image.tags.map((t) => (
                  <Link key={t} to={`/?search=${encodeURIComponent(t)}`} className="chip">#{t}</Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 className="section-title">相关图片</h2>
          <ImageGrid
            images={related}
            onSelect={(img) => navigate(`/image/${img.id}`)}
            onUpdate={(updated) => setRelated((prev) => prev.map((img) => (img.id === updated.id ? updated : img)))}
          />
        </div>
      )}

      {reportOpen && (
        <div className="modal-mask" onClick={() => setReportOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__title">举报图片</div>
            <textarea
              className="input"
              placeholder="请描述举报原因（色情、暴力、侵权等）"
              rows={4}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              style={{ resize: 'vertical', marginBottom: 12 }}
            />
            <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn--ghost" onClick={() => setReportOpen(false)}>取消</button>
              <button className="btn btn--primary" onClick={submitReport}>提交举报</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-mask" onClick={() => setConfirmDelete(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__title">删除图片</div>
            <div style={{ marginBottom: 16 }}>确定删除这张图片吗？此操作不可恢复。</div>
            <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>取消</button>
              <button className="btn btn--danger" onClick={handleDelete}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}