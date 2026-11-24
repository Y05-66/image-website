/**
 * 图片瀑布流网格：渲染一组图片卡片，空数据时展示占位提示。
 */
import ImageCard from './ImageCard.jsx'

export default function ImageGrid({ images, onSelect, onUpdate }) {
  if (!images || images.length === 0) {
    return <div className="empty">暂无图片</div>
  }
  return (
    <div className="masonry">
      {images.map((img) => (
        <ImageCard key={img.id} image={img} onClick={onSelect} onUpdate={onUpdate} />
      ))}
    </div>
  )
}