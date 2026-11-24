/**
 * 认证页布局：左侧品牌展示 + 右侧表单卡片。
 */
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-visual">
          <div className="auth-visual__content">
            <h1 className="auth-visual__title">二次元图库</h1>
            <p className="auth-visual__desc">发现、收藏与分享你喜欢的每一张图片</p>
            <ul className="auth-visual__features">
              <li>海量图片 · 实时搜索</li>
              <li>标签分类 · 智能推荐</li>
              <li>一键收藏 · 云端同步</li>
            </ul>
          </div>
        </aside>
        <section className="auth-panel">
          <div className="auth-panel__head">
            <h2 className="auth-panel__title">{title}</h2>
            <p className="auth-panel__sub">{subtitle}</p>
          </div>
          {children}
        </section>
      </div>
    </div>
  )
}