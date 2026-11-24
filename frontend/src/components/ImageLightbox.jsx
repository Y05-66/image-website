/**
 * 图片灯箱：全屏预览、键盘切换、点赞收藏与下载操作。
 * 大图加载中显示 spinner，切换时展示进度指示，点赞/收藏采用乐观更新。
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { imageApi, downloadImage } from '../api/index.js'
import { useToast } from '../context/ToastContext.jsx'

export default function ImageLightbox({ images, index, onClose, onIndexChange, onImageUpdate }) {
  const navigate = useNavigate()
  const toast = useToast()
  const image = images[index]
  const [busy, setBusy] = useState(false)
  const [imgLoading, setImgLoading] = useState(true)
  const [imgFailed, setImgFailed] = useState(false)

  /** 切换图片时重置大图加载状态。 */
  useEffect(() => {
    setImgLoading(true)
    setImgFailed(false)
  }, [image?.id])

  /** 预加载相邻图片，使左右切换更流畅。 */
  useEffect(() => {
    const preload = (img) => {
      if (img && img.url) {
        const el = new Image()
        el.src = img.url
      }
    }
    preload(images[index + 1])
    preload(images[index - 1])
  }, [index, images])

  /** 键盘事件：ESC 关闭、左右方向键切换。 */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1)
      else if (e.key === 'ArrowRight' && index < images.length - 1) onIndexChange(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, images.length, onClose, onIndexChange])

  if (!image) return null

  /** 向上层回传图片变更。 */
  const update = (patch) => onImageUpdate && onImageUpdate({ ...image, ...patch })

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

  /** 下载图片。 */
  const handleDownload = async () => {
    try {
      const filename = image.objectKey?.split('/').pop() || `image-${image.id}.${image.format || 'jpg'}`
      await downloadImage(image.id, filename)
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="lightbox" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={image.title || '图片预览'}>
        <button className="lightbox__close" onClick={onClose} aria-label="关闭">×</button>
        <div className="lightbox__counter">{index + 1} / {images.length}</div>
        {index > 0 && (
          <button
            className="lightbox__nav lightbox__nav--prev"
            onClick={() => onIndexChange(index - 1)}
            aria-label="上一张"
          >
            ‹
          </button>
        )}
        {index < images.length - 1 && (
          <button
            className="lightbox__nav lightbox__nav--next"
            onClick={() => onIndexChange(index + 1)}
            aria-label="下一张"
          >
            ›
          </button>
        )}
        {imgLoading && !imgFailed && (
          <div className="lightbox__loading"><span className="spinner" /></div>
        )}
        {imgFailed ? (
          <div className="lightbox__loading">图片加载失败</div>
        ) : (
          <img
            src={image.url}
            alt={image.title || ''}
            style={{ display: imgLoading ? 'none' : 'block' }}
            onLoad={() => setImgLoading(false)}
            onError={() => { setImgLoading(false); setImgFailed(true) }}
          />
        )}
        <div className="lightbox__actions">
          <button className={`btn btn--sm ${image.isLiked ? 'btn--primary' : ''}`} onClick={handleLike}>
            ♥{image.likeCount > 0 ? ` ${image.likeCount}` : ''}
          </button>
          <button className={`btn btn--sm ${image.isFavorite ? 'btn--primary' : ''}`} onClick={handleFavorite}>
            ★ 收藏
          </button>
          <button className="btn btn--sm" onClick={handleDownload}>⬇ 下载</button>
          <button className="btn btn--sm" onClick={() => navigate(`/image/${image.id}`)}>
            详情
          </button>
        </div>
      </div>
    </div>
  )
}