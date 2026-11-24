/**
 * 无限滚动 Hook：通过 IntersectionObserver 监听哨兵元素，触底时加载更多。
 * @param {object} opts { loading, hasMore, onLoadMore }
 */
import { useEffect, useRef } from 'react'

export default function useInfiniteScroll({ loading, hasMore, onLoadMore }) {
  const sentinelRef = useRef(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) onLoadMore()
      },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loading, hasMore, onLoadMore])

  return sentinelRef
}