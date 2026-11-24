# Image Website - Backend

## 技术栈
- Spring Boot 3.2.5 + Java 21
- Spring Security + JWT 认证
- Spring Data JPA
- MySQL（Docker 映射宿主机 3307；本机直连 3306）
- 阿里云 OSS STS 临时凭证直传 / 后端代理上传（流式中转，不落盘）
- 图形验证码 + 敏感词过滤 + 找回密码防枚举

## 启动方式

### Docker + MySQL
```bash
cd ..
docker-compose up -d          # 启动 MySQL（localhost:3307）
cd backend
mvn spring-boot:run           # 自动连接 MySQL
```

访问 http://localhost:8080

默认管理员账号：`admin` / `admin123`
普通用户测试账号：`testuser` / `test123456`

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册（默认 `USER` 角色） |
| POST | /api/auth/login | 登录（需图形验证码） |
| POST | /api/auth/forgot-password | 找回密码（用户名+邮箱，防枚举统一提示） |
| GET | /api/auth/me | 当前用户信息 |
| PATCH | /api/auth/me | 修改用户名/邮箱/头像 |
| GET | /api/captcha | 生成登录图形验证码 |
| GET | /api/oss/upload-signature | 获取上传签名 |
| POST | /api/oss/upload | 后端代理上传文件（返回 objectKey） |
| GET | /api/images | 图片列表（`categories`/`tags` 多选、`search`、`sort`、分页） |
| GET | /api/images/my | 我的上传图片 |
| GET | /api/images/my/favorites | 我的收藏 |
| GET | /api/images/my/likes | 我的点赞 |
| GET | /api/images/feed | 关注用户动态流 |
| GET | /api/images/popular | 热门图片 |
| GET | /api/images/tags | 热门标签 |
| GET | /api/images/suggestions | 标签联想 |
| GET | /api/images/ranking | 排行榜 |
| GET | /api/images/{id}/related | 相关图片推荐 |
| GET | /api/images/admin/pending | 待审核列表（仅管理员） |
| GET | /api/images/{id} | 单张图片详情 |
| POST | /api/images | 提交图片元数据（标题≤50字、标签至少一个、类型必选；普通用户进入待审核） |
| POST | /api/images/batch | 批量提交图片元数据 |
| PATCH | /api/images/{id} | 编辑标题/描述/类型（上传者或管理员） |
| PUT | /api/images/{id}/tags | 更新标签（上传者或管理员） |
| POST | /api/images/{id}/like | 点赞/取消点赞 |
| POST | /api/images/{id}/favorite | 收藏/取消收藏 |
| GET | /api/images/{id}/favorite/check | 检查是否已收藏 |
| POST | /api/images/{id}/approve | 审核通过（仅管理员） |
| POST | /api/images/{id}/reject | 审核驳回并删除（仅管理员） |
| GET | /api/images/{id}/download | 下载图片（仅管理员） |
| DELETE | /api/images/{id} | 删除图片（仅管理员） |
| GET | /api/comments | 图片评论列表（分页） |
| POST | /api/comments | 发表评论 |
| DELETE | /api/comments/{id} | 删除评论（本人或管理员） |
| GET | /api/boards | 我的收藏夹列表 |
| POST | /api/boards | 创建收藏夹 |
| GET | /api/boards/{id} | 收藏夹详情 |
| POST | /api/boards/{id}/images | 添加图片到收藏夹 |
| DELETE | /api/boards/{id}/images/{imageId} | 从收藏夹移除图片 |
| DELETE | /api/boards/{id} | 删除收藏夹 |
| POST | /api/follows/{targetUserId} | 关注用户 |
| DELETE | /api/follows/{targetUserId} | 取消关注 |
| GET | /api/follows/{targetUserId}/status | 关注状态 |
| GET | /api/follows/following | 我的关注 |
| GET | /api/follows/followers | 我的粉丝 |
| POST | /api/reports | 举报图片 |
| GET | /api/reports | 举报列表（仅管理员） |
| POST | /api/reports/{id}/resolve | 处理举报（仅管理员） |
| GET | /api/users/{username} | 用户公开资料 |
| POST | /api/users/{username}/reset-password | 重置用户密码（仅管理员） |

**多选筛选：** `GET /api/images` 的 `categories` / `tags` 可重复传参实现多选（如 `?categories=acg&categories=scenery&tags=风景`），均为「或」关系，不传则不做该维度筛选。

## 环境变量
- `OSS_ACCESS_KEY_ID` — RAM用户AccessKey ID（可选，未配置时使用占位图演示）
- `OSS_ACCESS_KEY_SECRET` — RAM用户AccessKey Secret
- `OSS_STS_ROLE_ARN` — STS角色ARN
- `OSS_BUCKET` — Bucket名称
- `OSS_REGION` — OSS地域
- `JWT_SECRET` — JWT密钥（最小32字符）
- `MYSQL_ROOT_PASSWORD` — MySQL root密码（默认 123456）