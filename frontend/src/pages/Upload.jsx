/**
 * 上传页：选择图片、逐张填写标题/类型/描述/标签，计算主色调后经后端代理上传。
 */
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { imageApi, uploadFile } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext.jsx'
import { CATEGORIES, TAG_OPTIONS, nearestPaletteColor } from '../constants'

export default function Upload() {
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [metaMap, setMetaMap] = useState({})
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadedCount, setUploadedCount] = useState(0)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)
  const previewsRef = useRef([])
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const isAdmin = user?.role === 'ADMIN'

  /** 单文件大小上限（字节）。 */
  const MAX_FILE_SIZE = 10 * 1024 * 1024

  /** 卸载时释放所有预览对象 URL，避免内存泄漏。 */
  useEffect(() => {
    previewsRef.current = previews
  }, [previews])

  useEffect(() => {
    return () => previewsRef.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  /** 添加图片文件：过滤非图片与超限文件，并生成预览 URL。 */
  const addFiles = (incoming) => {
    const valid = []
    const rejected = []
    incoming.forEach((f) => {
      if (!f.type.startsWith('image/')) return
      if (f.size > MAX_FILE_SIZE) { rejected.push(f); return }
      valid.push(f)
    })
    if (valid.length) {
      const idxBase = files.length
      const newMeta = {}
      valid.forEach((f, i) => {
        newMeta[idxBase + i] = { title: '', category: '', description: '', tags: [] }
      })
      setFiles((prev) => [...prev, ...valid])
      setPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))])
      setMetaMap((prev) => ({ ...prev, ...newMeta }))
    }
    if (rejected.length) {
      toast.error(`已忽略 ${rejected.length} 个超过 10MB 的文件`)
    }
  }

  /** 选择图片文件。 */
  const handleSelectFiles = (e) => {
    addFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  /** 移除指定索引的待上传图片并重排元信息与预览。 */
  const removeFile = (idx) => {
    URL.revokeObjectURL(previews[idx])
    setPreviews((prev) => prev.filter((_, i) => i !== idx))
    setFiles((prev) => prev.filter((_, i) => i !== idx))
    setMetaMap((prev) => {
      const next = {}
      Object.keys(prev).forEach((key) => {
        const k = Number(key)
        if (k < idx) next[k] = prev[k]
        else if (k > idx) next[k - 1] = prev[k]
      })
      return next
    })
  }

  /** 更新某张图片的元信息字段。 */
  const updateMeta = (idx, field, value) => {
    setMetaMap(prev => ({
      ...prev,
      [idx]: { ...prev[idx], [field]: value }
    }))
  }

  /** 切换某张图片的标签选中状态。 */
  const toggleTag = (idx, tag) => {
    setMetaMap(prev => {
      const cur = prev[idx]?.tags || []
      const next = cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag]
      return { ...prev, [idx]: { ...prev[idx], tags: next } }
    })
  }

  /** 读取图片原始宽高。 */
  const getImageDimensions = (f) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => { URL.revokeObjectURL(img.src); resolve({ width: img.naturalWidth, height: img.naturalHeight }) }
      img.onerror = () => { URL.revokeObjectURL(img.src); resolve({ width: null, height: null }) }
      img.src = URL.createObjectURL(f)
    })
  }

  // 计算主色调：缩放到 1x1 取平均色，并量化为调色板颜色，供颜色筛选精确匹配
  const getDominantColor = (f) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = 1
          canvas.height = 1
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, 1, 1)
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
          URL.revokeObjectURL(img.src)
          resolve(nearestPaletteColor(r, g, b))
        } catch {
          URL.revokeObjectURL(img.src)
          resolve('')
        }
      }
      img.onerror = () => { URL.revokeObjectURL(img.src); resolve('') }
      img.src = URL.createObjectURL(f)
    })
  }

  /** 提交上传：校验元信息后逐张上传文件并创建图片记录。 */
  const handleSubmit = async () => {
    if (files.length === 0) { toast.error('请先选择图片文件'); return }

    for (let i = 0; i < files.length; i++) {
      const meta = metaMap[i] || {}
      const title = (meta.title || '').trim()
      if (!title) {
        toast.error(`请为「${files[i].name}」填写标题（50字以内）`)
        return
      }
      if (title.length > 50) {
        toast.error(`「${files[i].name}」的标题不能超过50个字`)
        return
      }
      if (!meta.category) {
        toast.error(`请为「${files[i].name}」选择图片类型`)
        return
      }
      if (!meta.tags || meta.tags.length === 0) {
        toast.error(`请为「${files[i].name}」选择至少一个标签`)
        return
      }
    }

    setUploading(true)
    setProgress(0)
    setUploadedCount(0)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const meta = metaMap[i] || {}

        const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'jpg'
        // 通过后端代理上传，避免浏览器跨域直传 OSS
        const objectKey = await uploadFile(file)

        const [{ width, height }, dominantColor] = await Promise.all([
          getImageDimensions(file),
          getDominantColor(file),
        ])

        await imageApi.create({
          objectKey,
          width,
          height,
          fileSize: file.size,
          format: ext,
          dominantColor,
          title: (meta.title || '').trim(),
          category: meta.category,
          description: meta.description || '',
          tags: meta.tags || [],
        })

        setUploadedCount(i + 1)
        setProgress(Math.round(((i + 1) / files.length) * 100))
      }

      toast.success(isAdmin
        ? `成功上传 ${files.length} 张图片！`
        : `已提交 ${files.length} 张图片，待管理员审核通过后才会公开显示`)
      navigate('/')
    } catch (err) {
      console.error('Upload error:', err)
      toast.error(err.message || '上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <button className="nav-btn nav-btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: 16 }}>
        ← 返回
      </button>
      <h1 className="page-title">上传二次元 / 动漫图片</h1>
      {!isAdmin && (
        <p style={{ color: '#f59e0b', fontSize: 13, margin: '-8px 0 16px' }}>
          注意：普通用户上传的图片需经管理员审核通过后才会公开显示。
        </p>
      )}

      {/* File selector */}
      <div
        className={`upload-area${dragging ? ' upload-area--dragging' : ''}`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!uploading) addFiles(Array.from(e.dataTransfer.files)) }}
        style={{ marginBottom: 24 }}
      >
        <div className="upload-icon">＋</div>
        <div className="upload-text">
          {files.length ? `已选 ${files.length} 张图片，点击继续添加` : '点击或拖拽图片到这里'}
        </div>
        <div className="upload-hint">本图库仅限二次元 / 动漫图片 · 支持 JPG、PNG、GIF、WebP，每张最大 10MB</div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleSelectFiles}
          style={{ display: 'none' }}
        />
      </div>

      {/* File list with metadata editor */}
      {files.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {files.map((file, idx) => (
            <div key={idx} style={{
              display: 'flex', gap: 16, alignItems: 'flex-start',
              padding: 16, background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', marginBottom: 12
            }}>
              <img
                src={previews[idx]}
                alt=""
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name} · {(file.size / 1024).toFixed(0)} KB
                </div>
                <select
                  className="form-input"
                  value={metaMap[idx]?.category || ''}
                  onChange={e => updateMeta(idx, 'category', e.target.value)}
                  style={{ marginBottom: 6 }}
                >
                  <option value="" disabled>请选择图片类型（必选）</option>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <input
                  className="form-input"
                  placeholder="标题（必填，50字以内）"
                  value={metaMap[idx]?.title || ''}
                  maxLength={50}
                  onChange={e => updateMeta(idx, 'title', e.target.value)}
                  style={{ marginBottom: 6 }}
                />
                <textarea
                  className="form-input"
                  placeholder="描述（可选）"
                  value={metaMap[idx]?.description || ''}
                  onChange={e => updateMeta(idx, 'description', e.target.value)}
                  rows={2}
                  style={{ marginBottom: 6, resize: 'vertical' }}
                />
                <TagSelector
                  selected={metaMap[idx]?.tags || []}
                  onToggle={tag => toggleTag(idx, tag)}
                />
              </div>
              <button
                onClick={() => removeFile(idx)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', flexShrink: 0 }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {uploading && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: 'var(--surface-2)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
            <div style={{
              background: 'linear-gradient(90deg, var(--primary), #ff6b81)', height: '100%', width: `${progress}%`, transition: 'width 0.3s'
            }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            正在上传 {uploadedCount}/{files.length}
          </div>
        </div>
      )}

      <button
        className="btn btn--primary"
        onClick={handleSubmit}
        disabled={files.length === 0 || uploading}
        style={{ minWidth: 120 }}
      >
        {uploading ? `上传中... (${uploadedCount}/${files.length})` : `开始上传 (${files.length})`}
      </button>
    </div>
  )
}

/** 标签多选下拉组件。 */
function TagSelector({ selected, onToggle }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        className="form-input"
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
      >
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: selected.length ? 'var(--text)' : 'var(--muted)'
        }}>
          {selected.length ? selected.join('、') : '请选择标签（必选，可多选）'}
        </span>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: 'var(--shadow-lg)', maxHeight: 200, overflowY: 'auto',
          padding: 8, display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4
        }}>
          {TAG_OPTIONS.map(tag => {
            const active = selected.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onToggle(tag)}
                style={{
                  padding: '4px 10px', fontSize: 13, borderRadius: 14, cursor: 'pointer',
                  border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: active ? 'rgba(232,37,44,0.08)' : 'var(--surface)',
                  color: active ? 'var(--primary)' : 'var(--text-2)'
                }}
              >{tag}</button>
            )
          })}
        </div>
      )}
    </div>
  )
}