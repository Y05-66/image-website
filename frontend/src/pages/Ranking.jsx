/**
 * 排行榜页：按今日/本周/月度查看高赞图片，支持无限滚动与灯箱预览。
 */
import { useState, useEffect, useCallback } from 'react'
import { imageApi } from '../api/index.js'
import ImageGrid from '../components/ImageGrid.jsx'
import SkeletonGrid from '../components/SkeletonGrid.jsx'
import ImageLightbox from '../components/ImageLightbox.jsx'
import useInfiniteScroll from '../hooks/useInfiniteScroll.js'

/** 榜单周期选项。 */
const PERIODS = [
  { key: 'daily', label: '今日榜' },
  { key: 'weekly', label: '本周榜' },
  { key: 'monthly', label: '月度榜' },
]

export default function Ranking() {
  const [period, setPeriod] = useState('daily')
  const [images, setImages] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  /** 按页码拉取排行榜数据。 */
  const fetchPage = useCallback(
    (p) => imageApi.ranking(period, p, 20).then((r) => ({ items: r.data || [], totalPages: r.totalPages || 0 })),
    [period]
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(false)
    fetchPage(0)
      .then(({ items, totalPages }) => {
        if (cancelled) return
        setImages(items)
        setPage(0)
        setTotalPages(totalPages)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchPage, period, reloadKey])

  /** 加载更多（无限滚动触发）。 */
  const loadMore = useCallback(() => {
    const next = page + 1
    if (loadingMore || next >= totalPages) return
    setLoadingMore(true)
    fetchPage(next)
      .then(({ items }) => {
        setImages((prev) => [...prev, ...items])
        setPage(next)
      })
      .catch((e) => console.error('加载更多失败:', e))
      .finally(() => setLoadingMore(false))
  }, [page, totalPages, loadingMore, fetchPage])

  const sentinelRef = useInfiniteScroll({
    loading: loadingMore || loading,
    hasMore: page + 1 < totalPages,
    onLoadMore: loadMore,
  })

  /** 更新单张图片（点赞/收藏后回写）。 */
  const handleUpdate = (updated) => {
    setImages((prev) => prev.map((img) => (img.id === updated.id ? updated : img)))
  }

  return (
    <div>
      <h1 className="page-title">排行榜</h1>
      <div className="tabs">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className={`tab ${period === p.key ? 'active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonGrid count={12} />
      ) : loadError ? (
        <div className="empty">
          <p>加载失败，请稍后重试</p>
          <button className="btn btn--primary" style={{ marginTop: 12 }} onClick={() => setReloadKey((k) => k + 1)}>
            重新加载
          </button>
        </div>
      ) : images.length === 0 ? (
        <div className="empty">该时间段暂无数据</div>
      ) : (
        <>
          <ImageGrid images={images} onSelect={(img) => setLightboxIndex(images.indexOf(img))} onUpdate={handleUpdate} />
          <div ref={sentinelRef} />
          {loadingMore && (
            <div className="loading-center">
              <span className="skeleton" style={{ width: 120, height: 24, borderRadius: 12 }} />
            </div>
          )}
          {page + 1 >= totalPages && <div className="empty" style={{ padding: 20 }}>已经到底啦</div>}
        </>
      )}

      {lightboxIndex !== null && images[lightboxIndex] && (
        <ImageLightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onImageUpdate={handleUpdate}
        />
      )}
    </div>
  )
}