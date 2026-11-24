# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spring Boot 3 + React 18 image gallery website using Alibaba Cloud OSS for image storage. Uploads go through the backend proxy (`POST /api/oss/upload`) which streams bytes to OSS without persisting to disk; an STS direct-upload endpoint (`GET /api/oss/upload-signature`) remains as a fallback. The backend manages user auth, image metadata, comments, boards, follows, reports, content filtering, and STS credential issuance.

## Commands

**启动服务：**
```bat
start.bat                # 启动 Docker MySQL（可选）+ Backend(8080)
frontend\start.bat       # Vite dev server on port 5173
```

**手动启动：**
```bash
# 后端（连接本地 MySQL localhost:3306，密码 123456）
cd backend && mvn spring-boot:run

# 前端
cd frontend && npm run dev
```

默认管理员账号：`admin` / `admin123`
数据库：MySQL `localhost:3306`，数据库名 `image_website`

## Architecture

### Upload flow (critical to understand)
Uploads go through the backend proxy (streamed, never persisted to disk):
1. Frontend calls `uploadFile(file)` → `POST /api/oss/upload` (multipart, auth required)
2. `OssUploadService` streams the multipart bytes to OSS via the SDK and returns the generated `objectKey`
3. Frontend calls `POST /api/images` with only metadata (objectKey, width, height, title, tags…)
4. Backend validates the objectKey prefix (`images/`) and stores metadata in DB

A legacy STS direct-upload path (`GET /api/oss/upload-signature`) still exists but is not used by the current frontend.

Uploaded images default to `PENDING` status; only admins can publish immediately (status `APPROVED`). Admins manage pending content via `/api/images/admin/pending`, `/api/images/{id}/approve`, and `/api/images/{id}/reject`.

The OSS host and bucket name are configurable via env vars on both sides. Frontend `getImageUrl(objectKey, style)` in `api/index.js` appends `?x-oss-process=style/<name>` for thumbnail generation — no backend-side image processing exists.

### Security model
- Stateless JWT auth via `JwtAuthenticationFilter` — only `/api/auth/register`, `/api/auth/login`, `/api/auth/forgot-password`, and `/api/captcha` are public; every other `/api/**` route (including `/api/auth/me`) requires a valid Bearer token
- User roles: `ROLE_USER`, `ROLE_ADMIN`; the role is encoded into the JWT at login and parsed from the token claim inside the filter (`jwtUtil.parseRole`) — no per-request DB lookup
- Login requires a one-time graphical captcha (`GET /api/captcha`); captchas are held in memory with a TTL and invalidated on successful use
- User-generated content (comments, usernames, image title/description/tags) is screened by `SensitiveWordFilter` (hit → reject with HTTP 400)
- Password recovery (`/api/auth/forgot-password`) returns identical messages for "user not found" and "email mismatch" (HTTP 400) to prevent username enumeration
- CORS restricted to `localhost:5173`, `localhost:3000`, and `127.0.0.1:5173` in `SecurityConfig.java`; add production domains there
- `csrf` is disabled (stateless API); H2 console at `/h2-console` available only if `SPRING_PROFILES_ACTIVE=h2`

### Data layer
- JPA with Hibernate using MySQL; `ddl-auto: update` keeps schema synced
- Tag strings are stored as an `@ElementCollection` (`image_tag_values` composite table on `images`); favorites stored as another `@ElementCollection` (`image_favorites`) on `images`
- Both dev and production use the same MySQL instance (localhost:3306, root/123456) when run natively; Docker Compose maps host port 3307 → container 3306 (see `docker-compose.yml`)
- `application.yml` defaults the datasource URL to `localhost:3306`; the docker profile overrides this to connect to the container hostname `mysql`
- `DataInitializer` creates the default admin user on empty DB and migrates any legacy images missing a `status` field to `APPROVED`

### Frontend state
- Auth state lives in `AuthContext.jsx`; the token is persisted under key `token` — `localStorage` when "remember me" is checked, otherwise `sessionStorage` (read order prefers `sessionStorage`). The parsed user object is re-fetched from `/api/auth/me` on mount and held in React state (not persisted separately)
- All API calls go through `api/index.js` which injects the bearer token automatically and throws on non-zero `code` responses
- Router uses nested `<Routes>` inside `<Layout>` for authenticated pages; unauthenticated routes (`/login`, `/register`) sit outside
- `RequireAuth` renders `null` while auth is loading (prevents flash redirect); `RequireAdmin` gates the `/review` route
- Image URLs constructed via `getImageUrl(key, style)` in `api/index.js` which reads `VITE_OSS_BUCKET` / `VITE_OSS_REGION` env vars with fallback defaults

## Key Conventions

- All controller response bodies follow `{ code: 0, data: ..., message: "" }` format
- Image URLs in the frontend should be constructed via `getImageUrl(key, style)` not hardcoded
- New API endpoints added to controllers must also be added to `api/index.js` exports
- Image categories are constrained server-side to `{anime, game, illustration, meme, scenery, other}`; validation happens in `ImageController.createImage()`
- Tags are normalized to lowercase, trimmed, and deduplicated before persistence in both creation and update paths
- The `imgToMap` helper serializes entity fields to the JSON response shape used throughout; do not change its output format without updating frontend consumers
- Backend env vars (`OSS_*`, `JWT_SECRET`) come from `.env.example` — never commit real values

## Recent Additions

### New backend APIs (since init)
- `GET /api/images/my/favorites` — paginated favorites list (uses `findByFavoritedBy` repo query)
- `PATCH /api/images/{id}` — update title/description (uploader only)
- `GET /api/auth/me` — current user info
- `PATCH /api/auth/me` — update username/email (token regenerated if username changes)

### New frontend pages/flows
- **Favorites tab** — Gallery now has a 「收藏」tab reachable via `/gallery?tab=favorites`; URL stays in sync with view mode
- **Profile page** (`/profile`) — edit display name and email; new `<button>` added to Layout nav
- **Image detail inline edit** — uploader can click ✏️ to edit title/description in-place on `/image/:id`

### Frontend fixes applied
- `imageApi.myList` → `imageApi.my` (matched actual backend endpoint name)
- Added `imageApi.favorites()` and `imageApi.updateMeta()` to `api/index.js`
- `RequireAuth` now renders `null` while auth is loading (prevents flash redirect)
- `getImageUrl` supports env var overrides (`VITE_OSS_BUCKET`, `VITE_OSS_REGION`)

### Recent hardening & features (latest)
- **Sensitive word filtering** — `SensitiveWordFilter` screens comments, usernames, and image title/description/tags (substring + word-boundary matching, normalizes case/punctuation; hit → reject)
- **Login captcha** — `/api/captcha` + `useCaptcha.js`; login requires a one-time in-memory captcha
- **Anti-enumeration password recovery** — `/api/auth/forgot-password` returns identical error (HTTP 400) for unknown username vs. email mismatch
- **Social features** — comments, boards (collections), follows/followers, and reports are implemented across controllers/entities/repositories and frontend pages
- **Download fix (Firefox)** — download anchors are appended to `document.body` and the object URL is revoked after a 1s delay
- **Auth parity fix** — token read order unified (`sessionStorage` first) between `AuthContext` init and `api/index.js`
- **Upload/format fix** — files without an extension fall back to `jpg`; usernames are trimmed on registration; email may be cleared (non-null → update)