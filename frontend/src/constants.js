/**
 * 全局常量与工具函数：图片分类、标签选项、主色调调色板等。
 */

// 图片类型（分类）选项
export const CATEGORIES = [
  { value: 'acg', label: '二次元', color: '#ec4899' },
  { value: 'anime', label: '动漫壁纸', color: '#a855f7' },
  { value: 'game', label: '游戏CG', color: '#3b82f6' },
  { value: 'illustration', label: '同人插画', color: '#06b6d4' },
  { value: 'meme', label: '表情包', color: '#f59e0b' },
  { value: 'scenery', label: '风景场景', color: '#10b981' },
  { value: 'other', label: '其他', color: '#9ca3af' },
]

// 预定义标签选项（上传时下拉选择，可多选）
export const TAG_OPTIONS = [
  '游戏', '插画', '少女', '樱花', '风景',
  '表情包', '萌宠', '美食', '科技', '古风', '萝莉', '御姐', '星空', '萌',
]

// 根据 value 获取中文标签
export const categoryLabel = (value) => {
  const found = CATEGORIES.find(c => c.value === value)
  return found ? found.label : (value || '')
}

// 根据 value 获取分类专属颜色
export const categoryColor = (value) => {
  const found = CATEGORIES.find(c => c.value === value)
  return found ? found.color : '#e8252c'
}

// 主色调调色板（上传时量化主色调，颜色筛选时精确匹配）
export const COLOR_PALETTE = [
  { value: '#e74c3c', label: '红' },
  { value: '#f06292', label: '粉' },
  { value: '#ff9800', label: '橙' },
  { value: '#fdd835', label: '黄' },
  { value: '#66bb6a', label: '绿' },
  { value: '#26c6da', label: '青' },
  { value: '#42a5f5', label: '蓝' },
  { value: '#5c6bc0', label: '靛' },
  { value: '#ab47bc', label: '紫' },
  { value: '#ec407a', label: '玫' },
  { value: '#8d6e63', label: '棕' },
  { value: '#9e9e9e', label: '灰' },
  { value: '#ffffff', label: '白' },
  { value: '#000000', label: '黑' },
]

// 将任意 RGB 值量化为调色板中最接近的颜色
export function nearestPaletteColor(r, g, b) {
  let best = COLOR_PALETTE[0].value
  let bestDist = Infinity
  for (const c of COLOR_PALETTE) {
    const hex = c.value.slice(1)
    const pr = parseInt(hex.slice(0, 2), 16)
    const pg = parseInt(hex.slice(2, 4), 16)
    const pb = parseInt(hex.slice(4, 6), 16)
    const d = (pr - r) * (pr - r) + (pg - g) * (pg - g) + (pb - b) * (pb - b)
    if (d < bestDist) {
      bestDist = d
      best = c.value
    }
  }
  return best
}