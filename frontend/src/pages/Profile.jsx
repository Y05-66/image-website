/**
 * 个人中心：资料编辑、我的喜欢/收藏、收藏夹管理与关注/粉丝列表。
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { boardApi, followApi, imageApi } from '../api/index.js'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext.jsx'
import Avatar from '../components/Avatar.jsx'
import ImageGrid from '../components/ImageGrid.jsx'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState('boards')

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', avatar: '' })
  const [saving, setSaving] = useState(false)

  const [boards, setBoards] = useState([])
  const [newBoard, setNewBoard] = useState({ name: '', description: '' })

  const [following, setFollowing] = useState([])
  const [followers, setFollowers] = useState([])

  const [liked, setLiked] = useState([])
  const [favs, setFavs] = useState([])
  const [likedPage, setLikedPage] = useState(0)
  const [favPage, setFavPage] = useState(0)
  const [likedTotalPages, setLikedTotalPages] = useState(0)
  const [favTotalPages, setFavTotalPages] = useState(0)

  // 收藏夹详情查看
  const [boardDetail, setBoardDetail] = useState(null)
  const [boardImages, setBoardImages] = useState([])
  const [boardImagesLoading, setBoardImagesLoading] = useState(false)
  // 待删除的收藏夹（用于二次确认）
  const [deleteTarget, setDeleteTarget] = useState(null)

  /** 加载收藏夹列表。 */
  const loadBoards = () => boardApi.list().then((r) => setBoards(r.data || [])).catch(() => {})
  /** 加载关注与粉丝列表。 */
  const loadFollows = () => {
    followApi.following().then((r) => setFollowing(r.data || [])).catch(() => {})
    followApi.followers().then((r) => setFollowers(r.data || [])).catch(() => {})
  }

  /** 加载我喜欢的图片（分页）。 */
  const loadLikes = (page = 0) =>
    imageApi.myLikes(page, 20)
      .then((r) => {
        setLiked((prev) => (page === 0 ? r.data || [] : [...prev, ...(r.data || [])]))
        setLikedPage(page)
        setLikedTotalPages(r.totalPages || 0)
      })
      .catch(() => {})

  /** 加载我收藏的图片（分页）。 */
  const loadFavorites = (page = 0) =>
    imageApi.myFavorites(page, 20)
      .then((r) => {
        setFavs((prev) => (page === 0 ? r.data || [] : [...prev, ...(r.data || [])]))
        setFavPage(page)
        setFavTotalPages(r.totalPages || 0)
      })
      .catch(() => {})

  useEffect(() => {
    loadBoards()
    loadFollows()
  }, [])

  useEffect(() => {
    if (tab === 'likes') loadLikes(0)
    if (tab === 'favorites') loadFavorites(0)
  }, [tab])

  /** 进入资料编辑态并回填表单。 */
  const startEdit = () => {
    setForm({ username: user?.username || '', email: user?.email || '', avatar: user?.avatar || '' })
    setEditing(true)
  }

  /** 保存个人资料。 */
  const saveProfile = async () => {
    if (!form.username.trim() || form.username.trim().length < 2) {
      toast.error('用户名至少2个字符')
      return
    }
    setSaving(true)
    try {
      await updateUser({ username: form.username.trim(), email: form.email, avatar: form.avatar })
      setEditing(false)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  /** 新建收藏夹。 */
  const createBoard = async () => {
    if (!newBoard.name.trim()) {
      toast.error('请输入收藏夹名称')
      return
    }
    try {
      await boardApi.create(newBoard.name.trim(), newBoard.description)
      setNewBoard({ name: '', description: '' })
      await loadBoards()
    } catch (e) {
      toast.error(e.message)
    }
  }

  /** 删除收藏夹（经二次确认）。 */
  const deleteBoard = async () => {
    if (!deleteTarget) return
    try {
      await boardApi.remove(deleteTarget.id)
      setDeleteTarget(null)
      await loadBoards()
    } catch (e) {
      toast.error(e.message)
    }
  }

  /** 打开收藏夹详情，批量加载夹内图片。 */
  const openBoard = async (board) => {
    setBoardDetail(board)
    setBoardImages([])
    setBoardImagesLoading(true)
    try {
      const d = await boardApi.detail(board.id)
      const ids = d.data?.imageIds || []
      const imgs = ids.length ? await imageApi.batch(ids) : { data: [] }
      setBoardImages(imgs.data || [])
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBoardImagesLoading(false)
    }
  }

  /** 从收藏夹移除图片并同步计数。 */
  const removeFromBoard = async (boardId, imageId) => {
    try {
      await boardApi.removeImage(boardId, imageId)
      setBoardImages((prev) => prev.filter((i) => i.id !== imageId))
      setBoards((prev) => prev.map((b) =>
        b.id === boardId ? { ...b, imageCount: Math.max(0, (b.imageCount || 0) - 1) } : b
      ))
    } catch (e) {
      toast.error(e.message)
    }
  }

  /** 关注/取消关注。 */
  const toggleFollow = async (targetId, isFollowing) => {
    try {
      if (isFollowing) await followApi.unfollow(targetId)
      else await followApi.follow(targetId)
      await loadFollows()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const followingIds = new Set(following.map((u) => u.id))

  return (
    <div>
      <button className="nav-btn nav-btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        ← 返回
      </button>
      <div className="profile-card">
        <Avatar name={user?.username} src={user?.avatar} size={72} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <h1 className="page-title" style={{ margin: 0 }}>{user?.username}</h1>
            {user?.role === 'ADMIN' && <span className="tag">管理员</span>}
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            {user?.email || '未填写邮箱'}
          </div>
        </div>
        <button className="btn btn--outline" onClick={startEdit}>编辑资料</button>
      </div>

      {editing && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>编辑个人资料</div>
          <input
            className="input"
            placeholder="用户名（2-50字符）"
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            style={{ marginBottom: 8 }}
          />
          <input
            className="input"
            placeholder="邮箱"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            style={{ marginBottom: 8 }}
          />
          <input
            className="input"
            placeholder="头像 URL"
            value={form.avatar}
            onChange={(e) => setForm((p) => ({ ...p, avatar: e.target.value }))}
            style={{ marginBottom: 12 }}
          />
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn--primary" onClick={saveProfile} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </button>
            <button className="btn btn--ghost" onClick={() => setEditing(false)}>取消</button>
          </div>
        </div>
      )}

      <div className="tabs" style={{ marginTop: 20 }}>
        <button className={`tab ${tab === 'likes' ? 'active' : ''}`} onClick={() => setTab('likes')}>
          我的喜欢
        </button>
        <button className={`tab ${tab === 'favorites' ? 'active' : ''}`} onClick={() => setTab('favorites')}>
          我的收藏
        </button>
        <button className={`tab ${tab === 'boards' ? 'active' : ''}`} onClick={() => setTab('boards')}>
          收藏夹
        </button>
        <button className={`tab ${tab === 'follows' ? 'active' : ''}`} onClick={() => setTab('follows')}>
          关注 / 粉丝
        </button>
      </div>

      {tab === 'likes' && (
        <div>
          <div className="section-title">我喜欢的图片{liked.length > 0 ? `（${liked.length}）` : ''}</div>
          {liked.length === 0 ? (
            <div className="muted">还没有喜欢任何图片，去发现页点 ♥ 吧</div>
          ) : (
            <>
              <ImageGrid
                images={liked}
                onSelect={(img) => navigate(`/image/${img.id}`)}
                onUpdate={(updated) =>
                  setLiked((prev) =>
                    updated.isLiked
                      ? prev.map((i) => (i.id === updated.id ? updated : i))
                      : prev.filter((i) => i.id !== updated.id)
                  )
                }
              />
              {likedPage + 1 < likedTotalPages && (
                <button
                  className="btn btn--outline"
                  style={{ display: 'block', margin: '16px auto' }}
                  onClick={() => loadLikes(likedPage + 1)}
                >
                  加载更多
                </button>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'favorites' && (
        <div>
          <div className="section-title">我收藏的图片{favs.length > 0 ? `（${favs.length}）` : ''}</div>
          {favs.length === 0 ? (
            <div className="muted">还没有收藏任何图片，去图片详情页点 ★ 收藏吧</div>
          ) : (
            <>
              <ImageGrid
                images={favs}
                onSelect={(img) => navigate(`/image/${img.id}`)}
                onUpdate={(updated) =>
                  setFavs((prev) =>
                    updated.isFavorite
                      ? prev.map((i) => (i.id === updated.id ? updated : i))
                      : prev.filter((i) => i.id !== updated.id)
                  )
                }
              />
              {favPage + 1 < favTotalPages && (
                <button
                  className="btn btn--outline"
                  style={{ display: 'block', margin: '16px auto' }}
                  onClick={() => loadFavorites(favPage + 1)}
                >
                  加载更多
                </button>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'boards' && (
        <div>
          <div className="panel">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>新建收藏夹</div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <input
                className="input"
                placeholder="收藏夹名称"
                value={newBoard.name}
                onChange={(e) => setNewBoard((p) => ({ ...p, name: e.target.value }))}
              />
              <input
                className="input"
                placeholder="描述（可选）"
                value={newBoard.description}
                onChange={(e) => setNewBoard((p) => ({ ...p, description: e.target.value }))}
              />
              <button className="btn btn--primary" onClick={createBoard}>新建</button>
            </div>
          </div>

          <div className="section-title">我的收藏夹{boards.length > 0 ? `（${boards.length}）` : ''}</div>
          {boards.length === 0 ? (
            <div className="muted">还没有收藏夹，创建后可在图片详情页将图片加入</div>
          ) : (
            <div className="card-grid">
              {boards.map((b) => (
                <div key={b.id} className="board-card">
                  <div className="board-card__icon">{(b.name || '?').charAt(0).toUpperCase()}</div>
                  <div className="board-card__name">{b.name}</div>
                  <div className="board-card__desc">{b.description || '暂无描述'}</div>
                  <div className="board-card__meta">{b.imageCount > 0 ? `${b.imageCount} 张图片` : '暂无图片'}</div>
                  <div className="board-card__actions">
                    <button className="btn btn--sm btn--outline" onClick={() => openBoard(b)}>查看</button>
                    <button className="btn btn--sm btn--danger" onClick={() => setDeleteTarget(b)}>删除</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'follows' && (
        <div>
          <div className="section-title">我关注的{following.length > 0 ? `（${following.length}）` : ''}</div>
          {following.length === 0 ? (
            <div className="muted">还没有关注任何人</div>
          ) : (
            <div className="card-grid">
              {following.map((u) => (
                <div key={u.id} className="user-card">
                  <Avatar name={u.username} src={u.avatar} size={56} />
                  <div className="user-card__name">{u.username}</div>
                  <button className="btn btn--sm btn--ghost" onClick={() => toggleFollow(u.id, true)}>取消关注</button>
                </div>
              ))}
            </div>
          )}

          <div className="section-title">我的粉丝{followers.length > 0 ? `（${followers.length}）` : ''}</div>
          {followers.length === 0 ? (
            <div className="muted">还没有粉丝</div>
          ) : (
            <div className="card-grid">
              {followers.map((u) => {
                const isFollowing = followingIds.has(u.id)
                return (
                  <div key={u.id} className="user-card">
                    <Avatar name={u.username} src={u.avatar} size={56} />
                    <div className="user-card__name">{u.username}</div>
                    <button
                      className={`btn btn--sm ${isFollowing ? 'btn--ghost' : 'btn--primary'}`}
                      onClick={() => toggleFollow(u.id, isFollowing)}
                    >
                      {isFollowing ? '已关注' : '+ 回关'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {boardDetail && (
        <div className="modal-mask" onClick={() => setBoardDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal__title">{boardDetail.name}</div>
            {boardDetail.description && <div className="muted" style={{ marginBottom: 12 }}>{boardDetail.description}</div>}
            {boardImagesLoading ? (
              <div className="loading-center">
                <span className="skeleton" style={{ width: 160, height: 24, borderRadius: 12 }} />
              </div>
            ) : boardImages.length === 0 ? (
              <div className="muted">这个收藏夹还是空的，去图片详情页收藏图片吧</div>
            ) : (
              <div className="card-grid">
                {boardImages.map((img) => (
                  <div key={img.id} className="board-card">
                    <img
                      src={img.thumbUrl || img.url}
                      alt={img.title || ''}
                      loading="lazy"
                      style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 'var(--radius)' }}
                      onClick={() => { setBoardDetail(null); navigate(`/image/${img.id}`) }}
                    />
                    <div className="board-card__name" style={{ marginTop: 6 }}>{img.title || '未命名'}</div>
                    <div className="board-card__actions">
                      <button className="btn btn--sm btn--outline" onClick={() => { setBoardDetail(null); navigate(`/image/${img.id}`) }}>查看</button>
                      <button className="btn btn--sm btn--danger" onClick={() => removeFromBoard(boardDetail.id, img.id)}>移除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="row" style={{ gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn--ghost" onClick={() => setBoardDetail(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-mask" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__title">删除收藏夹</div>
            <div style={{ marginBottom: 16 }}>确定删除收藏夹「{deleteTarget.name}」吗？收藏夹内的图片不会被删除。</div>
            <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn--ghost" onClick={() => setDeleteTarget(null)}>取消</button>
              <button className="btn btn--danger" onClick={deleteBoard}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}