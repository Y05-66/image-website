/**
 * 加载骨架屏：以瀑布流布局展示若干灰色占位块。
 */
export default function SkeletonGrid({ count = 10 }) {
  const heights = [220, 300, 260, 340, 200, 320, 240, 280, 360, 230]
  return (
    <div className="masonry">
      {Array.from({ length: count }).map((_, i) => (
        <div className="masonry__item" key={i}>
          <div
            className="skeleton"
            style={{ height: heights[i % heights.length] }}
          />
        </div>
      ))}
    </div>
  )
}