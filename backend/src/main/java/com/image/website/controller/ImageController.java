package com.image.website.controller;

import com.image.website.entity.Image;
import com.image.website.entity.User;
import com.image.website.entity.Follow;
import com.image.website.repository.ImageRepository;
import com.image.website.repository.CommentRepository;
import com.image.website.repository.UserRepository;
import com.image.website.repository.FollowRepository;
import com.image.website.config.EnvLoader;
import com.image.website.util.SensitiveWordFilter;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 图片核心接口：列表检索、详情、创建、点赞收藏、审核、下载等全流程。
 */
@Slf4j
@RestController
@RequestMapping("/api/images")
@RequiredArgsConstructor
public class ImageController {

    private final ImageRepository imageRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final FollowRepository followRepository;

    /** 允许的图片类型（上传时必选其一）。 */
    private static final Set<String> ALLOWED_CATEGORIES = Set.of(
            "acg", "anime", "game", "illustration", "meme", "scenery", "other");

    /** 图片列表：支持 category/tag/search/sort 参数（可组合筛选）。 */
    @GetMapping
    public ResponseEntity<?> listImages(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<String> categories,
            @RequestParam(required = false) List<String> colors,
            @RequestParam(defaultValue = "newest") String sort,
            Authentication auth) {

        Sort sortOrder = switch (sort) {
            case "popular" -> Sort.by(Sort.Direction.DESC, "likeCount");
            case "views" -> Sort.by(Sort.Direction.DESC, "views");
            case "downloads" -> Sort.by(Sort.Direction.DESC, "downloadCount");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };

        List<String> categoryList = normalizeList(categories);
        List<String> tagList = normalizeList(tags);
        List<String> colorList = normalizeList(colors);
        String keywordParam = (search != null && !search.isBlank()) ? search.trim() : null;

        Page<Image> images = imageRepository.searchImages(
                categoryList, tagList, colorList, keywordParam, "APPROVED",
                PageRequest.of(page, size, sortOrder));

        return okPaginated(images, auth != null ? Long.valueOf(auth.getName()) : null, isAdmin(auth));
    }

    /** 清洗多选参数：去空白、转小写、去重；空集合返回 null 表示不筛选。 */
    private static List<String> normalizeList(List<String> values) {
        if (values == null || values.isEmpty()) return null;
        List<String> cleaned = values.stream()
                .filter(v -> v != null && !v.isBlank())
                .map(v -> v.trim().toLowerCase())
                .distinct()
                .collect(Collectors.toList());
        return cleaned.isEmpty() ? null : cleaned;
    }

    /** 我的收藏。 */
    @GetMapping("/my/favorites")
    public ResponseEntity<?> myFavorites(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        Page<Image> images = imageRepository.findByFavoritedBy(userId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return okPaginated(images, userId, isAdmin(auth));
    }

    /** 我的点赞（喜欢）。 */
    @GetMapping("/my/likes")
    public ResponseEntity<?> myLikes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        Page<Image> images = imageRepository.findByLikedBy(userId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return okPaginated(images, userId, isAdmin(auth));
    }

    /** 我上传的图片。 */
    @GetMapping("/my")
    public ResponseEntity<?> myListImages(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        Page<Image> images = imageRepository.findByUploaderId(userId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return okPaginated(images, userId, isAdmin(auth));
    }

    /** 关注流：我关注的创作者的图片。 */
    @GetMapping("/feed")
    public ResponseEntity<?> feed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        List<Long> followingIds = followRepository.findByFollowerId(userId).stream()
                .map(Follow::getFollowingId)
                .collect(Collectors.toList());
        if (followingIds.isEmpty()) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("code", 0);
            result.put("data", Collections.emptyList());
            result.put("totalPages", 0);
            result.put("totalElements", 0);
            return ResponseEntity.ok(result);
        }
        Page<Image> images = imageRepository.findByUploaderIdInAndStatusOrderByCreatedAtDesc(
                followingIds, "APPROVED", PageRequest.of(page, size));
        return okPaginated(images, userId, isAdmin(auth));
    }

    /** 热门图片：按点赞数降序。 */
    @GetMapping("/popular")
    public ResponseEntity<?> popularImages(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        Page<Image> images = imageRepository.findByStatus("APPROVED",
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "likeCount")));
        return okPaginated(images, auth != null ? Long.valueOf(auth.getName()) : null, isAdmin(auth));
    }

    /** 按 ID 批量查询图片（供收藏夹详情等场景批量加载，不增加浏览量）。 */
    @PostMapping("/batch")
    public ResponseEntity<?> batchImages(@RequestBody Map<String, List<Long>> body, Authentication auth) {
        List<Long> ids = body == null ? Collections.emptyList() : body.get("ids");
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.ok(Map.of("code", 0, "data", Collections.emptyList()));
        }
        List<Long> distinctIds = ids.stream().distinct().collect(Collectors.toList());
        Long viewerId = auth != null ? Long.valueOf(auth.getName()) : null;
        Map<Long, Image> byId = imageRepository.findAllById(distinctIds).stream()
                .collect(Collectors.toMap(Image::getId, i -> i));
        Map<Long, String> names = resolveNames(
                byId.values().stream().map(Image::getUploaderId).collect(Collectors.toSet()));
        List<Map<String, Object>> items = distinctIds.stream()
                .filter(byId::containsKey)
                .map(byId::get)
                .map(i -> imgToMap(i, viewerId, isAdmin(auth), names))
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("code", 0, "data", items));
    }

    /** 标签云：按出现频率取前 N 个标签。 */
    @GetMapping("/tags")
    public ResponseEntity<?> listTags(@RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(Map.of("code", 0, "data",
                imageRepository.findTopTagsByStatus("APPROVED", PageRequest.of(0, limit))));
    }

    /** 搜索联想：返回匹配的标签 + 标题。 */
    @GetMapping("/suggestions")
    public ResponseEntity<?> suggestions(@RequestParam(defaultValue = "") String q,
                                         @RequestParam(defaultValue = "8") int limit) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(Map.of("code", 0, "data",
                    Map.of("tags", Collections.emptyList(), "titles", Collections.emptyList())));
        }
        String kw = q.trim();
        Pageable pageable = PageRequest.of(0, limit);
        List<String> tags = imageRepository.findTagSuggestions(kw, pageable);
        List<String> titles = imageRepository.findTitleSuggestions(kw, pageable);
        return ResponseEntity.ok(Map.of("code", 0, "data", Map.of("tags", tags, "titles", titles)));
    }

    /** 排行榜：daily / weekly / monthly。 */
    @GetMapping("/ranking")
    public ResponseEntity<?> ranking(
            @RequestParam(defaultValue = "daily") String period,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        Instant since = switch (period) {
            case "weekly" -> Instant.now().minus(7, ChronoUnit.DAYS);
            case "monthly" -> Instant.now().minus(30, ChronoUnit.DAYS);
            default -> Instant.now().minus(1, ChronoUnit.DAYS);
        };
        Page<Image> images = imageRepository.findRankingSince(since, PageRequest.of(page, size));
        return okPaginated(images, auth != null ? Long.valueOf(auth.getName()) : null, isAdmin(auth));
    }

    /** 相关图片：按共同标签数量排序。 */
    @GetMapping("/{id}/related")
    public ResponseEntity<?> relatedImages(
            @PathVariable Long id,
            @RequestParam(defaultValue = "8") int limit,
            Authentication auth) {
        return imageRepository.findById(id)
                .map(img -> {
                    Set<String> tags = img.getTags();
                    if (tags == null || tags.isEmpty()) {
                        return ResponseEntity.ok(Map.of("code", 0, "data", Collections.emptyList()));
                    }
                    List<Image> related = imageRepository
                            .findRelated(id, tags, PageRequest.of(0, limit)).stream()
                            .map(arr -> (Image) arr[0])
                            .collect(Collectors.toList());
                    Map<Long, String> names = resolveNames(
                            related.stream().map(Image::getUploaderId).collect(Collectors.toSet()));
                    Long viewerId = auth != null ? Long.valueOf(auth.getName()) : null;
                    List<Map<String, Object>> items = related.stream()
                            .map(i -> imgToMap(i, viewerId, isAdmin(auth), names))
                            .collect(Collectors.toList());
                    return ResponseEntity.ok(Map.of("code", 0, "data", items));
                })
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "图片不存在")));
    }

    /** 单张详情（浏览量 +1，原子更新避免覆盖并发修改）。 */
    @GetMapping("/{id}")
    @Transactional
    public ResponseEntity<?> getImage(@PathVariable Long id, Authentication auth) {
        Long viewerId = auth != null ? Long.valueOf(auth.getName()) : null;
        return imageRepository.findById(id)
                .map(img -> {
                    // 待审核图片仅管理员与上传者本人可见，避免未公开内容被越权访问
                    if (!"APPROVED".equals(img.getStatus()) && !isAdmin(auth)
                            && (viewerId == null || !viewerId.equals(img.getUploaderId()))) {
                        return ResponseEntity.status(404).body(Map.of("code", 404, "message", "图片不存在"));
                    }
                    imageRepository.incrementViews(id);
                    Map<String, Object> data = imgToMap(img, viewerId, isAdmin(auth),
                            resolveNames(Set.of(img.getUploaderId())));
                    // 浏览量已由 incrementViews 原子自增，这里 +1 反映最新值，避免脏检查回写覆盖并发自增
                    data.put("views", img.getViews() + 1);
                    data.put("commentCount", commentRepository.countByImageId(id));
                    return ResponseEntity.ok(Map.of("code", 0, "data", data));
                })
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "图片不存在")));
    }

    /** 创建图片（管理员直接发布，普通用户进入待审核状态）。 */
    @PostMapping
    public ResponseEntity<?> createImage(@RequestBody CreateImageRequest req, Authentication auth) {
        Long uploaderId = Long.valueOf(auth.getName());

        if (req.getObjectKey() == null || !req.getObjectKey().startsWith("images/")) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "非法objectKey，必须以images/开头"));
        }
        if (req.getCategory() == null || !ALLOWED_CATEGORIES.contains(req.getCategory())) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "请选择有效的图片类型"));
        }
        if (req.getTitle() == null || req.getTitle().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "标题不能为空"));
        }
        if (req.getTitle().trim().length() > 50) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "标题不能超过50个字"));
        }
        if (req.getTags() == null || req.getTags().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "请至少选择一个标签"));
        }
        if (SensitiveWordFilter.find(req.getTitle()) != null) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "标题包含违规词，请修改后重试"));
        }
        if (SensitiveWordFilter.find(req.getDescription()) != null) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "描述包含违规词，请修改后重试"));
        }
        for (String t : req.getTags()) {
            if (SensitiveWordFilter.find(t) != null) {
                return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "标签包含违规词，请修改后重试"));
            }
        }

        String bucket = EnvLoader.get("OSS_BUCKET");
        String region = EnvLoader.get("OSS_REGION");
        String url = "https://" + (bucket != null ? bucket : "image-website-dev-y")
                + ".oss-" + (region != null ? region : "cn-beijing")
                + ".aliyuncs.com/" + req.getObjectKey();

        Image image = new Image();
        image.setObjectKey(req.getObjectKey());
        image.setUrl(url);
        image.setWidth(req.getWidth());
        image.setHeight(req.getHeight());
        image.setFileSize(req.getFileSize());
        image.setFormat(req.getFormat());
        image.setUploaderId(uploaderId);
        image.setTitle(req.getTitle());
        image.setCategory(req.getCategory());
        image.setDescription(req.getDescription());
        image.setDominantColor(req.getDominantColor());

        Set<String> tags = new HashSet<>();
        if (req.getTags() != null) {
            tags = req.getTags().stream()
                    .filter(t -> t != null && !t.isBlank())
                    .map(String::trim).map(String::toLowerCase)
                    .collect(Collectors.toSet());
        }
        image.setTags(tags);

        // 管理员上传直接发布；普通用户上传进入待审核状态
        image.setStatus(isAdmin(auth) ? "APPROVED" : "PENDING");

        imageRepository.save(image);
        return ResponseEntity.ok(Map.of("code", 0, "data",
                imgToMap(image, uploaderId, isAdmin(auth), resolveNames(Set.of(uploaderId)))));
    }

    /** 更新标签。 */
    @PutMapping("/{id}/tags")
    public ResponseEntity<?> updateTags(@PathVariable Long id,
            @RequestBody Map<String, Object> body, Authentication auth) {
        return imageRepository.findById(id)
                .map(img -> {
                    if (!isAdmin(auth) && !img.getUploaderId().equals(Long.valueOf(auth.getName()))) {
                        return ResponseEntity.status(403).body(Map.of("code", 403, "message", "无权限修改此图片"));
                    }
                    @SuppressWarnings("unchecked")
                    List<String> tags = (List<String>) body.get("tags");
                    if (tags == null) tags = Collections.emptyList();
                    for (String t : tags) {
                        if (SensitiveWordFilter.find(t) != null) {
                            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "标签包含违规词，请修改后重试"));
                        }
                    }
                    img.setTags(new HashSet<>(tags.stream()
                            .filter(t -> t != null && !t.isBlank())
                            .map(String::trim).map(String::toLowerCase)
                            .collect(Collectors.toList())));
                    imageRepository.save(img);
                    return ResponseEntity.ok(Map.of("code", 0, "data", img.getTags()));
                })
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "图片不存在")));
    }

    /** 点赞/取消点赞。 */
    @PostMapping("/{id}/like")
    @Transactional
    public ResponseEntity<?> toggleLike(@PathVariable Long id, Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        return imageRepository.findByIdForUpdate(id)
                .map(img -> {
                    Set<Long> likedBy = img.getLikedBy();
                    if (likedBy == null) {
                        likedBy = new HashSet<>();
                        img.setLikedBy(likedBy);
                    }
                    boolean wasLiked = likedBy.contains(userId);
                    if (wasLiked) {
                        likedBy.remove(userId);
                    } else {
                        likedBy.add(userId);
                    }
                    // 以去重后的集合大小为准，避免历史脏数据导致计数与去重结果不一致
                    img.setLikeCount(likedBy.size());
                    imageRepository.save(img);
                    return ResponseEntity.ok(Map.of("code", 0, "data", Map.of(
                            "likeCount", img.getLikeCount(),
                            "isLiked", !wasLiked)));
                })
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "图片不存在")));
    }

    /** 收藏/取消收藏。 */
    @PostMapping("/{id}/favorite")
    @Transactional
    public ResponseEntity<?> toggleFavorite(@PathVariable Long id, Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        return imageRepository.findByIdForUpdate(id)
                .map(img -> {
                    Set<Long> favorites = img.getFavorites();
                    if (favorites == null) {
                        favorites = new HashSet<>();
                        img.setFavorites(favorites);
                    }
                    boolean wasFav = favorites.contains(userId);
                    if (wasFav) {
                        favorites.remove(userId);
                    } else {
                        favorites.add(userId);
                    }
                    imageRepository.save(img);
                    return ResponseEntity.ok(Map.of("code", 0, "data", Map.of(
                            "isFavorite", !wasFav,
                            "favorites", favorites.size())));
                })
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "图片不存在")));
    }

    /** 检查是否已收藏。 */
    @GetMapping("/{id}/favorite/check")
    public ResponseEntity<?> checkFavorite(@PathVariable Long id, Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        return imageRepository.findById(id)
                .map(img -> ResponseEntity.ok(Map.of("code", 0, "data", Map.of(
                        "isFavorite", img.getFavorites() != null && img.getFavorites().contains(userId)))))
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "图片不存在")));
    }

    /** 删除图片（仅管理员）。 */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteImage(@PathVariable Long id, Authentication auth) {
        return imageRepository.findById(id)
                .map(img -> {
                    if (!isAdmin(auth)) {
                        return ResponseEntity.status(403).body(Map.of("code", 403, "message", "只有管理员可以删除图片"));
                    }
                    imageRepository.delete(img);
                    return ResponseEntity.ok(Map.of("code", 0, "message", "删除成功"));
                })
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "图片不存在")));
    }

    /** 更新标题/描述/类型。 */
    @PatchMapping("/{id}")
    public ResponseEntity<?> updateImageMeta(@PathVariable Long id,
            @RequestBody Map<String, Object> body, Authentication auth) {
        return imageRepository.findById(id)
                .map(img -> {
                    if (!isAdmin(auth) && !img.getUploaderId().equals(Long.valueOf(auth.getName()))) {
                        return ResponseEntity.status(403).body(Map.of("code", 403, "message", "无权限修改此图片"));
                    }
                    if (body.containsKey("title")) {
                        String title = (String) body.get("title");
                        if (title == null || title.trim().isEmpty()) {
                            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "标题不能为空"));
                        }
                        if (title.trim().length() > 50) {
                            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "标题不能超过50个字"));
                        }
                        if (SensitiveWordFilter.find(title.trim()) != null) {
                            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "标题包含违规词，请修改后重试"));
                        }
                        img.setTitle(title.trim());
                    }
                    if (body.containsKey("description")) {
                        String desc = (String) body.get("description");
                        if (SensitiveWordFilter.find(desc) != null) {
                            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "描述包含违规词，请修改后重试"));
                        }
                        img.setDescription(desc);
                    }
                    if (body.containsKey("category")) {
                        String cat = (String) body.get("category");
                        if (cat == null || !ALLOWED_CATEGORIES.contains(cat)) {
                            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "请选择有效的图片类型"));
                        }
                        img.setCategory(cat);
                    }
                    imageRepository.save(img);
                    return ResponseEntity.ok(Map.of("code", 0, "data",
                            imgToMap(img, Long.valueOf(auth.getName()), isAdmin(auth),
                                    resolveNames(Set.of(img.getUploaderId())))));
                })
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "图片不存在")));
    }

    /** 待审核列表（仅管理员）。 */
    @GetMapping("/admin/pending")
    public ResponseEntity<?> pendingImages(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        if (!isAdmin(auth)) {
            return ResponseEntity.status(403).body(Map.of("code", 403, "message", "仅管理员可查看待审核列表"));
        }
        Page<Image> images = imageRepository.findByStatus("PENDING",
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return okPaginated(images, null, true);
    }

    /** 审核通过（仅管理员）。 */
    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveImage(@PathVariable Long id, Authentication auth) {
        if (!isAdmin(auth)) {
            return ResponseEntity.status(403).body(Map.of("code", 403, "message", "仅管理员可审核图片"));
        }
        return imageRepository.findById(id)
                .map(img -> {
                    img.setStatus("APPROVED");
                    imageRepository.save(img);
                    return ResponseEntity.ok(Map.of("code", 0, "message", "审核通过"));
                })
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "图片不存在")));
    }

    /** 审核驳回（仅管理员）。 */
    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectImage(@PathVariable Long id, Authentication auth) {
        if (!isAdmin(auth)) {
            return ResponseEntity.status(403).body(Map.of("code", 403, "message", "仅管理员可审核图片"));
        }
        return imageRepository.findById(id)
                .map(img -> {
                    imageRepository.delete(img);
                    return ResponseEntity.ok(Map.of("code", 0, "message", "已驳回并删除"));
                })
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "图片不存在")));
    }

    /** 下载图片（官方下载通道，所有登录用户可用）：原子自增下载量后流式转发 OSS 内容，避免整图载入内存。 */
    @GetMapping("/{id}/download")
    @Transactional
    public ResponseEntity<?> downloadImage(@PathVariable Long id, Authentication auth) {
        Long viewerId = auth != null ? Long.valueOf(auth.getName()) : null;
        return imageRepository.findById(id)
                .<ResponseEntity<?>>map(img -> {
                    // 待审核图片仅管理员与上传者本人可下载
                    if (!"APPROVED".equals(img.getStatus()) && !isAdmin(auth)
                            && (viewerId == null || !viewerId.equals(img.getUploaderId()))) {
                        return ResponseEntity.status(404).body(Map.of("code", 404, "message", "图片不存在"));
                    }
                    imageRepository.incrementDownloadCount(id);
                    String url = img.getUrl();
                    String filename = deriveFilename(img);
                    return ResponseEntity.ok()
                            .header(HttpHeaders.CONTENT_DISPOSITION,
                                    "attachment; filename=\"" + filename + "\"")
                            .contentType(MediaType.APPLICATION_OCTET_STREAM)
                            .body((StreamingResponseBody) out -> streamFromOss(url, out));
                })
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "图片不存在")));
    }

    /** 从 OSS 流式读取并写入响应输出流，避免把整张图片读入内存。 */
    private static void streamFromOss(String url, java.io.OutputStream out) {
        try {
            java.net.HttpURLConnection conn =
                    (java.net.HttpURLConnection) new java.net.URL(url).openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(20000);
            try (java.io.InputStream in = conn.getInputStream()) {
                in.transferTo(out);
            } finally {
                conn.disconnect();
            }
        } catch (Exception e) {
            throw new RuntimeException("下载失败：" + e.getMessage(), e);
        }
    }

    /** 判断当前登录用户是否为管理员。 */
    private static boolean isAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    /** 根据 objectKey 或格式推导下载文件名。 */
    private static String deriveFilename(Image img) {
        String key = img.getObjectKey();
        if (key != null && key.contains("/")) {
            return key.substring(key.lastIndexOf('/') + 1);
        }
        String ext = img.getFormat() != null ? img.getFormat() : "jpg";
        return "image-" + img.getId() + "." + ext;
    }

    /** 构造统一的分页响应：数据列表 + 总页数 + 总条数。 */
    private ResponseEntity<Map<String, Object>> okPaginated(Page<Image> page, Long viewerId, boolean isAdmin) {
        Map<Long, String> names = resolveNames(
                page.getContent().stream().map(Image::getUploaderId).collect(Collectors.toSet()));
        List<Map<String, Object>> items = new ArrayList<>();
        for (Image img : page.getContent()) {
            items.add(imgToMap(img, viewerId, isAdmin, names));
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("code", 0);
        result.put("data", items);
        result.put("totalPages", page.getTotalPages());
        result.put("totalElements", page.getTotalElements());
        return ResponseEntity.ok(result);
    }

    /** 按角色返回字段：审核状态 status、上传者内部 ID uploaderId 仅管理员可见。 */
    private Map<String, Object> imgToMap(Image img, Long viewerId, boolean isAdmin, Map<Long, String> names) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", img.getId());
        m.put("objectKey", img.getObjectKey());
        m.put("url", img.getUrl());
        m.put("thumbUrl", img.getThumbUrl());
        m.put("width", img.getWidth());
        m.put("height", img.getHeight());
        m.put("fileSize", img.getFileSize());
        m.put("format", img.getFormat());
        m.put("dominantColor", img.getDominantColor() == null ? "" : img.getDominantColor());
        m.put("uploaderName", names.getOrDefault(img.getUploaderId(), "匿名"));
        if (isAdmin) {
            m.put("uploaderId", img.getUploaderId());
        }
        m.put("isOwner", viewerId != null && viewerId.equals(img.getUploaderId()));
        m.put("title", img.getTitle());
        m.put("category", img.getCategory());
        m.put("description", img.getDescription());
        m.put("tags", img.getTags() != null ? new ArrayList<>(img.getTags()) : Collections.emptyList());
        m.put("likeCount", img.getLikeCount());
        m.put("views", img.getViews());
        m.put("downloadCount", img.getDownloadCount());
        m.put("favoriteCount", img.getFavorites() != null ? img.getFavorites().size() : 0);
        if (isAdmin) {
            m.put("status", img.getStatus() == null ? "APPROVED" : img.getStatus());
        }
        if (viewerId != null && img.getFavorites() != null) {
            m.put("isFavorite", img.getFavorites().contains(viewerId));
        }
        if (viewerId != null && img.getLikedBy() != null) {
            m.put("isLiked", img.getLikedBy().contains(viewerId));
        }
        m.put("createdAt", img.getCreatedAt());
        return m;
    }

    /** 批量解析上传者用户名为用户名，避免 N+1 查询。 */
    private Map<Long, String> resolveNames(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) return Collections.emptyMap();
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId,
                        u -> u.getUsername() == null ? "匿名" : u.getUsername()));
    }

    /** 创建图片请求体。 */
    @Data
    public static class CreateImageRequest {
        /** OSS 对象存储键。 */
        private String objectKey;
        /** 图片宽度（像素）。 */
        private Integer width;
        /** 图片高度（像素）。 */
        private Integer height;
        /** 文件大小（字节）。 */
        private Long fileSize;
        /** 文件格式（如 jpg/png）。 */
        private String format;
        /** 标题。 */
        private String title;
        /** 图片分类。 */
        private String category;
        /** 描述。 */
        private String description;
        /** 主色调。 */
        private String dominantColor;
        /** 标签集合。 */
        private List<String> tags = new ArrayList<>();
    }
}