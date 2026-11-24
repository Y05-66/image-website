/**
 * 单张图片卡片：懒加载缩略图，加载中显示占位，加载失败显示兜底，
 * 悬浮层展示点赞/收藏操作。点赞/收藏采用乐观更新：先本地翻转状态，失败再回滚并提示。
 */
import { useState } from 'react'
import { imageApi } from '../api/index.js'
import { useToast } from '../context/ToastContext.jsx'

export default function ImageCard({ image, onClick, onUpdate }) {
  const toast = useToast()
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const ratio =
    image.width && image.height ? `${image.width} / ${image.height}` : '4 / 3'

  /** 向上层回传图片变更。 */
  const update = (patch) => onUpdate && onUpdate({ ...image, ...patch })

  /** 点赞/取消点赞（乐观更新：先本地翻转，失败回滚）。 */
  const handleLike = async () => {
    if (busy) return
    const next = !image.isLiked
    const prevCount = image.likeCount ?? 0
    update({ isLiked: next, likeCount: prevCount + (next ? 1 : -1) })
    setBusy(true)
    try {
      const d = await imageApi.like(image.id)
      update({ likeCount: d.data.likeCount, isLiked: d.data.isLiked })
    } catch (e) {
      update({ isLiked: !next, likeCount: prevCount })
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  /** 收藏/取消收藏（乐观更新：先本地翻转，失败回滚）。 */
  const handleFavorite = async () => {
    if (busy) return
    const next = !image.isFavorite
    const prevCount = image.favoriteCount ?? 0
    update({ isFavorite: next, favoriteCount: prevCount + (next ? 1 : -1) })
    setBusy(true)
    try {
      const d = await imageApi.favorite(image.id)
      update({ isFavorite: d.data.isFavorite, favoriteCount: d.data.favorites })
    } catch (e) {
      update({ isFavorite: !next, favoriteCount: prevCount })
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="masonry__item">
      <div className="img-card" onClick={() => onClick(image)}>
        {!failed ? (
          <img
            className="img-card__ph"
            src={image.thumbUrl || image.url}
            alt={image.title || ''}
            loading="lazy"
            style={{
              aspectRatio: ratio,
              background: image.dominantColor || '#e5e7eb',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.3s',
            }}
            onLoad={() => setLoaded(true)}
            onError={(e) => {
              // 缩略图失败先回退原图，原图也失败则展示兜底占位
              if (e.currentTarget.src !== image.url) {
                e.currentTarget.src = image.url
              } else {
                setFailed(true)
              }
            }}
          />
        ) : (
          <div className="img-error" style={{ aspectRatio: ratio }}>图片加载失败</div>
        )}
        {!loaded && !failed && (
          <div
            className="img-loading"
            style={{ position: 'absolute', inset: 0, background: image.dominantColor || '#e5e7eb' }}
          >
            <span
              className="spinner"
              style={{ width: 24, height: 24, borderColor: 'rgba(0,0,0,0.12)', borderTopColor: 'rgba(0,0,0,0.4)' }}
            />
          </div>
        )}
        <div className="img-card__overlay">
          <div className="img-card__title">{image.title}</div>
          <div className="img-card__stats">
            <button
              type="button"
              className={`img-card__stat ${image.isLiked ? 'liked' : ''}`}
              onClick={(e) => { e.stopPropagation(); handleLike() }}
              disabled={busy}
              title={image.isLiked ? '取消点赞' : '点赞'}
            >
              ♥ {image.likeCount ?? 0}
            </button>
            <button
              type="button"
              className={`img-card__stat ${image.isFavorite ? 'favorited' : ''}`}
              onClick={(e) => { e.stopPropagation(); handleFavorite() }}
              disabled={busy}
              title={image.isFavorite ? '取消收藏' : '收藏'}
            >
              ★ {image.favoriteCount ?? 0}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}