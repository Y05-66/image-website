/**
 * 头像组件：有图片地址时显示图片，否则根据用户名生成渐变色首字头像。
 */

/** 备选渐变背景色列表。 */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #f97316, #ef4444)',
  'linear-gradient(135deg, #a855f7, #ec4899)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)',
  'linear-gradient(135deg, #10b981, #22c55e)',
  'linear-gradient(135deg, #f59e0b, #f97316)',
  'linear-gradient(135deg, #ec4899, #f43f5e)',
  'linear-gradient(135deg, #6366f1, #a855f7)',
  'linear-gradient(135deg, #14b8a6, #0ea5e9)',
]

/** 根据用户名计算稳定的哈希值，用于选择渐变背景。 */
function nameHash(name) {
  let h = 0
  const s = String(name || '')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** 头像组件入口。 */
export default function Avatar({ name, src, size = 32 }) {
  if (src) {
    return (
      <span className="avatar" style={{ width: size, height: size }}>
        <img src={src} alt={name || 'avatar'} />
      </span>
    )
  }
  const gradient = AVATAR_GRADIENTS[nameHash(name) % AVATAR_GRADIENTS.length]
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.45, background: gradient }}>
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  )
}