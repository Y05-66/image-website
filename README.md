# Image Website 🖼️

Spring Boot 3 + React 18 + 阿里云 OSS 图片网站 — 完整功能版

---

## ✨ 新增功能

### 图片管理
- **标签系统** — 每张图片可打多个标签，标签云快速分类浏览
- **全文搜索** — 按标题或描述关键词实时搜索
- **类型 + 标签多选筛选** — 「类型」「标签」两类独立分组，可同时选择多个类型、多个标签，也可以都不选（不选即全部），与搜索、排序自由组合
- **排序** — 支持按「最新发布」「最多点赞」排序
- **批量上传** — 一次选择多张图片，分别填写标题/描述/标签后统一提交
- **上传必填规则** — 标题（50 字以内）、标签（至少一个）、类型（7 类必选其一）为必填，描述可选
- **审核系统** — 普通用户上传的图片进入「待审核」，管理员审核通过后公开显示；管理员上传则直接发布

### 社交互动
- **点赞** — 一键点赞，展示总点赞数
- **收藏** — 收藏喜欢的图片，收藏图标高亮状态同步
- **我的喜欢 / 我的收藏** — 个人中心新增「我的喜欢」「我的收藏」标签页，集中查看点赞和收藏过的图片，支持加载更多
- **个人画廊** — 「我的」标签页只看自己上传的图片
- **热门标签** — 自动统计并展示热度最高的标签
- **评论** — 图片详情页可发表/删除评论（本人或管理员可删除）
- **收藏夹** — 创建自定义收藏夹，将图片归入不同分组统一管理
- **关注 / 粉丝** — 关注创作者，动态流查看关注用户的新作品
- **举报** — 用户可举报违规图片，管理员在后台处理举报

### 交互体验
- **灯箱预览** — 点击图片打开全屏预览 Modal，右侧显示详细信息
- **标签管理** — 上传者可在详情页添加/删除自己的标签
- **复制图片URL** — 点击 URL 输入框一键复制到剪贴板
- **懒加载优化** — 列表页使用 `loading="lazy"` 和 `decoding="async"`
- **搜索历史** — 搜索框自动记录最近搜索词（本地保存），点击即可复用
- **明暗主题切换** — 支持亮色 / 暗色主题切换，全站配色协调
- **登录验证码** — 登录需输入图形验证码，防止暴力破解与机器人

### UI 与视觉
- **卡片式布局** — 全站统一卡片风格，筛选区、收藏夹、关注/粉丝、上传文件列表、举报列表、详情页侧栏均以卡片呈现，圆角 + 阴影 + 悬浮上移动效
- **彩色渐变主题** — 页面背景粉蓝紫柔和渐变，顶部导航栏红粉紫渐变，Logo 白字投影
- **彩色头像** — 无头像用户按用户名哈希分配 8 种彩色渐变
- **分类专属色** — 图片类型七类各有专属色，筛选标签与详情页类型徽章按分类着色
- **胶囊式标签页** — 各页面 Tab 统一为胶囊切换控件，选中项渐变填充

---

## 🚀 快速启动

### Docker 一键启动（含 MySQL）
```bat
start.bat              # 启动 MySQL + Backend
frontend\start.bat     # 启动前端开发服务器（另一终端）
```

### 手动启动
```bash
# 启动 MySQL（容器端口 3307）
docker-compose up -d

# 后端（默认连接 MySQL）
cd backend && mvn spring-boot:run

# 前端
cd frontend && npm run dev
```

访问 http://localhost:5173（前端默认端口）

默认管理员账号：`admin` / `admin123`
普通用户测试账号：`testuser` / `test123456`
数据库：MySQL，数据库名 `image_website`（Docker 方式映射到宿主机 `3307`；本机直接运行 `mvn spring-boot:run` 时默认连接 `localhost:3306`）

---

## 📋 系统要求

| 组件 | 版本 |
|------|------|
| Java | 21+ |
| Maven | 3.9+ |
| Node.js | 18+ |
| Docker | 24+（可选，用于 MySQL 生产部署） |

---

## 🔧 OSS 配置说明

当前开发阶段使用占位凭证，不影响基础功能演示。如需对接真实 OSS：

1. 在阿里云控制台创建 Bucket，开启公共读、配置 CORS
2. 创建 RAM 角色 `oss-image-uploader`，授权 `oss:PutObject` 到指定前缀
3. 设置环境变量后重启后端：
   ```bash
   export OSS_ACCESS_KEY_ID=xxx
   export OSS_ACCESS_KEY_SECRET=xxx
   export OSS_STS_ROLE_ARN=acs:ram::<account-id>:role/oss-image-uploader
   export OSS_BUCKET=your-bucket-name
   export OSS_REGION=cn-hangzhou
   ```

详细步骤见 `开发文档.md` 第2-3章及 `.env.example`。

---

## 🏗️ 技术架构

```
浏览器 ──① 上传图片（multipart）──▶ Spring Boot (8080)
Spring Boot ──② 流式转发至 OSS（不落盘）──▶ 阿里云 OSS
浏览器 ◀──③ 返回 objectKey ── Spring Boot
浏览器 ──④ 提交元数据 ──▶ Spring Boot ──▶ MySQL (3307)
```

**核心设计原则：**
- 图片文件由后端**流式中转**上传到 OSS，应用服务器不落盘、不持久化
- STS 临时凭证保护长期密钥安全（15 分钟有效期，`upload-signature` 为直传备用通道）
- OSS 图片处理服务按需生成缩略图，无需自建处理服务
- 仅存元数据到数据库，保持数据库轻量

---

## 🔌 API 接口

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册（默认 `USER` 角色） | ❌ |
| POST | `/api/auth/login` | 用户登录（需图形验证码） | ❌ |
| POST | `/api/auth/forgot-password` | 找回密码（用户名 + 邮箱，防枚举统一提示） | ❌ |
| GET | `/api/auth/me` | 当前用户信息 | ✅ |
| PATCH | `/api/auth/me` | 修改用户名/邮箱/头像 | ✅ |
| GET | `/api/captcha` | 生成登录图形验证码 | ❌ |
| GET | `/api/oss/upload-signature` | 获取 OSS 上传签名 | ✅ |
| POST | `/api/oss/upload` | 后端代理上传文件（返回 `objectKey`） | ✅ |
| GET | `/api/images` | 图片列表（支持 `categories` / `tags` 多选、`search`、`sort`、分页） | ✅ |
| GET | `/api/images/my` | 我的上传图片 | ✅ |
| GET | `/api/images/my/favorites` | 我的收藏 | ✅ |
| GET | `/api/images/my/likes` | 我的点赞 | ✅ |
| GET | `/api/images/feed` | 关注用户的动态流 | ✅ |
| GET | `/api/images/popular` | 热门图片（按点赞数排序） | ✅ |
| GET | `/api/images/tags` | 热门标签列表 | ✅ |
| GET | `/api/images/suggestions` | 标签联想 | ✅ |
| GET | `/api/images/ranking` | 排行榜 | ✅ |
| GET | `/api/images/{id}/related` | 相关图片推荐 | ✅ |
| GET | `/api/images/admin/pending` | 待审核图片列表 | ✅（仅管理员） |
| GET | `/api/images/{id}` | 单张图片详情（含 `isFavorite` / `isLiked`） | ✅ |
| POST | `/api/images` | 创建图片元数据（普通用户进入待审核，管理员直接发布） | ✅ |
| POST | `/api/images/batch` | 批量创建图片元数据 | ✅ |
| PATCH | `/api/images/{id}` | 编辑标题/描述/类型 | ✅（上传者或管理员） |
| PUT | `/api/images/{id}/tags` | 更新标签 | ✅（上传者或管理员） |
| POST | `/api/images/{id}/like` | 点赞/取消点赞 | ✅ |
| POST | `/api/images/{id}/favorite` | 收藏/取消收藏 | ✅ |
| GET | `/api/images/{id}/favorite/check` | 检查是否已收藏 | ✅ |
| POST | `/api/images/{id}/approve` | 审核通过 | ✅（仅管理员） |
| POST | `/api/images/{id}/reject` | 审核驳回并删除 | ✅（仅管理员） |
| GET | `/api/images/{id}/download` | 下载图片 | ✅（仅管理员） |
| DELETE | `/api/images/{id}` | 删除图片 | ✅（仅管理员） |
| GET | `/api/comments` | 图片评论列表（分页） | ✅ |
| POST | `/api/comments` | 发表评论 | ✅ |
| DELETE | `/api/comments/{id}` | 删除评论 | ✅（本人或管理员） |
| GET | `/api/boards` | 我的收藏夹列表 | ✅ |
| POST | `/api/boards` | 创建收藏夹 | ✅ |
| GET | `/api/boards/{id}` | 收藏夹详情 | ✅ |
| POST | `/api/boards/{id}/images` | 添加图片到收藏夹 | ✅ |
| DELETE | `/api/boards/{id}/images/{imageId}` | 从收藏夹移除图片 | ✅ |
| DELETE | `/api/boards/{id}` | 删除收藏夹 | ✅ |
| POST | `/api/follows/{targetUserId}` | 关注用户 | ✅ |
| DELETE | `/api/follows/{targetUserId}` | 取消关注 | ✅ |
| GET | `/api/follows/{targetUserId}/status` | 关注状态 | ✅ |
| GET | `/api/follows/following` | 我的关注 | ✅ |
| GET | `/api/follows/followers` | 我的粉丝 | ✅ |
| POST | `/api/reports` | 举报图片 | ✅ |
| GET | `/api/reports` | 举报列表 | ✅（仅管理员） |
| POST | `/api/reports/{id}/resolve` | 处理举报 | ✅（仅管理员） |
| GET | `/api/users/{username}` | 用户公开资料 | ✅ |
| POST | `/api/users/{username}/reset-password` | 重置用户密码 | ✅（仅管理员） |

**列表接口多选筛选说明：** `GET /api/images` 的 `categories` 与 `tags` 支持重复传参实现多选，例如 `?categories=acg&categories=scenery&tags=风景&tags=少女`；两者均为「或」关系（命中任一即返回）。不传则不做该维度筛选。

**响应格式：**
```json
{ "code": 0, "data": {...}, "message": "" }
```

---

## 📂 项目结构

```
image-website-dev/
├── backend/src/main/java/com/image/website/
│   ├── controller/        AuthController · ImageController · OssController · CommentController · BoardController · FollowController · ReportController · UserController · CaptchaController
│   ├── entity/            Image · User · Tag · ImageTag · ImageTagId · Comment · Board · Follow · Report
│   ├── repository/        ImageRepository · UserRepository · TagRepository · CommentRepository · BoardRepository · FollowRepository · ReportRepository
│   ├── service/           AuthService · OssStsService · OssUploadService · CustomUserDetailsService · TagService · CaptchaService
│   ├── security/          JwtUtil · JwtAuthenticationFilter · SecurityConfig
│   ├── util/              SensitiveWordFilter
│   └── config/            PasswordConfig · DataInitializer · EnvLoader
├── frontend/src/
│   ├── pages/             Gallery · Ranking · Feed · Upload · ImageDetail · Profile · AdminReview · Login · Register · ForgotPassword · NotFound
│   ├── components/        Layout · AuthLayout · Avatar · ImageCard · ImageGrid · ImageLightbox · SkeletonGrid · RequireAuth · RequireAdmin
│   ├── context/           AuthContext
│   ├── hooks/             useInfiniteScroll · useCaptcha
│   ├── constants.js       分类 / 标签 / 调色板常量
│   └── api/index.js       所有 API 调用封装
├── docker-compose.yml     MySQL + Backend 编排
├── start.bat              Windows 一键启动脚本
└── .env.example           环境变量模板
```

---

## ⚙️ 部署检查清单

上线前完成：

1. [ ] 阿里云 OSS 创建 Bucket，权限设为**公共读**，关闭阻止公共访问
2. [ ] 配置 CORS 规则，允许前端域名 `GET/POST/PUT`
3. [ ] 创建 RAM 角色 `oss-image-uploader`，Policy 限制 `oss:PutObject` 到 `images/*` 前缀
4. [ ] 在 OSS 控制台创建图片处理样式（thumb-sm/w_200、thumb-md/w_800 等）
5. [ ] 设置环境变量并启动后端
6. [ ] 前端构建 `npm run build`，将 `dist/` 部署至 CDN 或静态托管服务

---

## 🔒 安全部署必做事项

> ⚠️ 以下事项直接关系到账号与数据安全，公开仓库或生产环境**上线前必须逐项完成**。

1. **修改默认管理员密码** — 代码中硬编码了 `admin / admin123`，任何人克隆仓库都能看到。首次登录后立即修改，或改动 [DataInitializer.java](backend/src/main/java/com/image/website/config/DataInitializer.java) 里的初始值。
2. **设置强 JWT 密钥** — `application.yml` 里的默认值是开发占位符，生产环境**必须**通过 `JWT_SECRET` 环境变量覆盖（随机 32 字符以上）。密钥一旦泄露，任何人都能伪造登录态（含管理员权限）。
3. **妥善保管 OSS AccessKey** — 真实密钥只应存在于本机 `.env`（已被 `.gitignore` 排除，不会进入版本库）。若密钥曾以截图、聊天记录等方式泄露，请到阿里云控制台**禁用并重新生成**。
4. **生产环境关闭 DEBUG 日志** — 将 `application.yml` 中 `logging.level.com.image.website` 由 `DEBUG` 改为 `INFO`，避免敏感信息进入日志。
5. **（建议）仓库设为私有** — 代码中保留了默认账号与测试脚本（`test-api.ps1`），若不想公开这些信息，建议将 GitHub 仓库设为 Private。

---

## 🐛 故障排查

| 问题 | 解决方案 |
|------|----------|
| JWT 签名无效 | 检查 `JWT_SECRET` 长度至少32字符 |
| OSS 上传失败 | 检查 STS 凭证有效期及 bucket CORS 配置 |
| 跨域报错 | 在 `SecurityConfig.java` 中添加前端域名到 `allowedOrigins` |
| 标签未生效 | 确认 `@ElementCollection` 注解的 CollectionTable 名称正确 |
| MySQL 连接失败 | `docker ps` 确认容器运行中，默认端口 3307（docker-compose.yml 映射） |