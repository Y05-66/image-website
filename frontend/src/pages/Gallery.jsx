/**
 * 发现页：图片列表的多视图（发现/热门/我的/收藏/喜欢）、搜索、分类与标签筛选。
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { imageApi } from '../api/index.js'
import { CATEGORIES, categoryLabel } from '../constants.js'
import ImageGrid from '../components/ImageGrid.jsx'
import SkeletonGrid from '../components/SkeletonGrid.jsx'
import ImageLightbox from '../components/ImageLightbox.jsx'
import useInfiniteScroll from '../hooks/useInfiniteScroll.js'

/** 视图模式选项。 */
const VIEW_MODES = [
  { key: 'all', label: '发现' },
  { key: 'popular', label: '热门' },
  { key: 'my', label: '我的' },
  { key: 'favorites', label: '收藏' },
  { key: 'likes', label: '喜欢' },
]

export default function Gallery() {
  const [searchParams] = useSearchParams()
  const initialSearch = searchParams.get('search') || ''
  const [viewMode, setViewMode] = useState('all')
  const [images, setImages] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [initialLoading, setInitialLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [search, setSearch] = useState(initialSearch)
  const [appliedSearch, setAppliedSearch] = useState(initialSearch)
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches') || '[]')
    } catch {
      return []
    }
  })
  const [selectedTags, setSelectedTags] = useState([])
  const [selectedCategories, setSelectedCategories] = useState([])
  const [sort, setSort] = useState('newest')
  const [tags, setTags] = useState([])

  const [suggestions, setSuggestions] = useState({ tags: [], titles: [] })
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestTimer = useRef(null)

  const [lightboxIndex, setLightboxIndex] = useState(null)

  /** 按视图模式与筛选条件拉取一页数据。 */
  const fetchPage = useCallback(
    async (pageNum) => {
      let res
      if (viewMode === 'popular') {
        res = await imageApi.popular(pageNum, 20)
      } else if (viewMode === 'my') {
        res = await imageApi.my(pageNum, 20)
      } else if (viewMode === 'favorites') {
        res = await imageApi.myFavorites(pageNum, 20)
      } else if (viewMode === 'likes') {
        res = await imageApi.myLikes(pageNum, 20)
      } else {
        res = await imageApi.list({
          page: pageNum,
          size: 20,
          search: appliedSearch,
          tags: selectedTags,
          categories: selectedCategories,
          sort,
        })
      }
      return { items: res.data || [], totalPages: res.totalPages || 0 }
    },
    [viewMode, appliedSearch, selectedTags, selectedCategories, sort]
  )

  // 首次加载 / 筛选条件变化时重置
  useEffect(() => {
    let cancelled = false
    setInitialLoading(true)
    setError('')
    fetchPage(0)
      .then(({ items, totalPages }) => {
        if (cancelled) return
        setImages(items)
        setPage(0)
        setTotalPages(totalPages)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e.message || '加载失败，请稍后重试')
      })
      .finally(() => {
        if (!cancelled) {
          setInitialLoading(false)
          setHasLoadedOnce(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [fetchPage, viewMode, reloadKey])

  // 加载标签云（仅发现视图需要）
  useEffect(() => {
    imageApi
      .tags(30)
      .then((res) => setTags(res.data || []))
      .catch(() => {})
  }, [])

  /** 搜索输入防抖：停止输入 250ms 后请求联想词。 */
  const handleSearchChange = (value) => {
    setSearch(value)
    setShowSuggestions(true)
    if (suggestTimer.current) clearTimeout(suggestTimer.current)
    if (!value.trim()) {
      setSuggestions({ tags: [], titles: [] })
      return
    }
    suggestTimer.current = setTimeout(() => {
      imageApi
        .suggestions(value.trim())
        .then((res) => setSuggestions(res.data || { tags: [], titles: [] }))
        .catch(() => setSuggestions({ tags: [], titles: [] }))
    }, 250)
  }

  /** 应用搜索关键词、写入最近搜索并重置分页。 */
  const applySearch = (value) => {
    setSearch(value)
    setAppliedSearch(value.trim())
    setShowSuggestions(false)
    setPage(0)
    const keyword = value.trim()
    if (keyword) {
      setRecentSearches((prev) => {
        const next = [keyword, ...prev.filter((s) => s !== keyword)].slice(0, 10)
        localStorage.setItem('recentSearches', JSON.stringify(next))
        return next
      })
    }
  }

  /** 清空最近搜索记录。 */
  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('recentSearches')
  }

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
    loading: loadingMore || initialLoading,
    hasMore: page + 1 < totalPages,
    onLoadMore: loadMore,
  })

  /** 切换某个筛选值的选中状态。 */
  const toggle = (setter, value) => {
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
    setPage(0)
  }

  /** 清空所有筛选条件。 */
  const clearFilters = () => {
    setSearch('')
    setAppliedSearch('')
    setSelectedTags([])
    setSelectedCategories([])
    setPage(0)
  }

  const hasFilters = Boolean(appliedSearch || selectedTags.length || selectedCategories.length)

  /** 更新单张图片（点赞/收藏后回写；在「我的收藏/喜欢」视图下取消后移除卡片）。 */
  const handleImageUpdate = (updated) => {
    setImages((prev) => {
      if (viewMode === 'likes' && updated.isLiked === false) {
        return prev.filter((img) => img.id !== updated.id)
      }
      if (viewMode === 'favorites' && updated.isFavorite === false) {
        return prev.filter((img) => img.id !== updated.id)
      }
      return prev.map((img) => (img.id === updated.id ? updated : img))
    })
  }

  return (
    <div>
      <div className="tabs">
        {VIEW_MODES.map((v) => (
          <button
            key={v.key}
            className={`tab ${viewMode === v.key ? 'active' : ''}`}
            onClick={() => {
              setViewMode(v.key)
              setPage(0)
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {viewMode === 'all' && (
        <div className="panel filter-panel" style={{ marginBottom: 20 }}>
          <div className="filter-row">
            <div className="search-box">
              <span className="search-box__icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                className="input"
                placeholder="搜索标题、描述或标签…"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch(search)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions &&
                (search.trim() !== ''
                  ? suggestions.tags.length > 0 || suggestions.titles.length > 0
                  : recentSearches.length > 0) && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      boxShadow: 'var(--shadow-lg)',
                      marginTop: 4,
                      padding: 6,
                      maxHeight: 260,
                      overflowY: 'auto',
                    }}
                  >
                    {search.trim() === '' ? (
                      <>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '4px 10px 8px',
                          }}
                        >
                          <span className="muted" style={{ fontSize: 12 }}>最近搜索</span>
                          <button
                            type="button"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--muted)',
                              fontSize: 12,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              clearRecentSearches()
                            }}
                          >
                            清空
                          </button>
                        </div>
                        {recentSearches.map((s) => (
                          <div
                            key={`recent-${s}`}
                            className="row"
                            style={{ padding: '6px 10px', cursor: 'pointer', borderRadius: 6 }}
                            onMouseDown={() => applySearch(s)}
                          >
                            <span style={{ color: 'var(--muted)', marginRight: 6 }} aria-hidden="true">↺</span>
                            {s}
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        {suggestions.tags.map((t) => (
                          <div
                            key={`t-${t}`}
                            className="row"
                            style={{ padding: '6px 10px', cursor: 'pointer', borderRadius: 6 }}
                            onMouseDown={() => applySearch(t)}
                          >
                            <span style={{ color: 'var(--muted)' }}>#</span> {t}
                          </div>
                        ))}
                        {suggestions.titles.map((t) => (
                          <div
                            key={`ti-${t}`}
                            className="row"
                            style={{ padding: '6px 10px', cursor: 'pointer', borderRadius: 6 }}
                            onMouseDown={() => applySearch(t)}
                          >
                            <span style={{ color: 'var(--muted)' }}>标题</span> {t}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
            </div>
            <select className="select" style={{ width: 130 }} value={sort} onChange={(e) => { setSort(e.target.value); setPage(0) }}>
              <option value="newest">最新</option>
              <option value="popular">最热</option>
              <option value="views">浏览最多</option>
              <option value="downloads">下载最多</option>
            </select>
          </div>

          <div className="filter-row">
            <span className="filter-label filter-label--type">类型</span>
            <div className="chips">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  className={`chip ${selectedCategories.includes(c.value) ? 'active' : ''}`}
                  style={selectedCategories.includes(c.value) ? { background: c.color, borderColor: c.color } : undefined}
                  onClick={() => toggle(setSelectedCategories, c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {tags.length > 0 && (
            <div className="filter-row">
              <span className="filter-label filter-label--tag">标签</span>
              <div className="chips">
                {tags.slice(0, 24).map((t) => (
                  <button
                    key={t}
                    className={`chip ${selectedTags.includes(t) ? 'active' : ''}`}
                    onClick={() => toggle(setSelectedTags, t)}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasFilters && (
            <div className="filter-row" style={{ justifyContent: 'flex-end' }}>
              <span className="muted" style={{ fontSize: 13 }}>
                已筛选：{selectedCategories.map(categoryLabel).concat(selectedTags.map((t) => `#${t}`)).join('、')}
                {appliedSearch && `“${appliedSearch}”`}
              </span>
              <button className="btn btn--sm btn--ghost" onClick={clearFilters}>清除筛选</button>
            </div>
          )}
        </div>
      )}

      {initialLoading && !hasLoadedOnce ? (
        <SkeletonGrid count={12} />
      ) : error ? (
        <div className="empty">
          <div style={{ fontSize: 15, color: 'var(--text)' }}>{error}</div>
          <button className="btn btn--outline" style={{ marginTop: 12 }} onClick={() => setReloadKey((k) => k + 1)}>
            重新加载
          </button>
        </div>
      ) : images.length === 0 ? (
        <div className="empty">暂无图片，快去上传或调整筛选条件吧</div>
      ) : (
        <>
          <ImageGrid images={images} onSelect={(img) => setLightboxIndex(images.indexOf(img))} onUpdate={handleImageUpdate} />
          <div ref={sentinelRef} />
          {loadingMore && (
            <div className="loading-center">
              <span className="skeleton" style={{ width: 120, height: 24, borderRadius: 12 }} />
            </div>
          )}
          {page + 1 >= totalPages && images.length > 0 && (
            <div className="empty" style={{ padding: 20 }}>已经到底啦</div>
          )}
        </>
      )}

      {lightboxIndex !== null && images[lightboxIndex] && (
        <ImageLightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onImageUpdate={handleImageUpdate}
        />
      )}
    </div>
  )
}