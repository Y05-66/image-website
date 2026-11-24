package com.image.website.controller;

import com.image.website.entity.Comment;
import com.image.website.entity.User;
import com.image.website.repository.CommentRepository;
import com.image.website.repository.ImageRepository;
import com.image.website.repository.UserRepository;
import com.image.website.util.SensitiveWordFilter;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 评论接口：分页查询、发表与删除评论（本人或管理员可删除）。
 */
@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final ImageRepository imageRepository;

    /** 某张图片的评论列表（分页，最新在前）。 */
    @GetMapping
    public ResponseEntity<?> list(@RequestParam Long imageId,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size,
                                  Authentication auth) {
        Page<Comment> comments = commentRepository.findByImageIdOrderByCreatedAtDesc(
                imageId, PageRequest.of(page, size));
        Map<Long, String> names = resolveNames(comments.getContent().stream()
                .map(Comment::getUserId).collect(Collectors.toSet()));
        Long viewerId = auth != null ? Long.valueOf(auth.getName()) : null;
        List<Map<String, Object>> items = comments.getContent().stream()
                .map(c -> toMap(c, names, viewerId, isAdmin(auth)))
                .collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("code", 0);
        result.put("data", items);
        result.put("totalPages", comments.getTotalPages());
        result.put("totalElements", comments.getTotalElements());
        return ResponseEntity.ok(result);
    }

    /** 发表评论。 */
    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateCommentRequest req, Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        if (req.getImageId() == null) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "缺少图片ID"));
        }
        if (!imageRepository.existsById(req.getImageId())) {
            return ResponseEntity.status(404).body(Map.of("code", 404, "message", "图片不存在"));
        }
        if (req.getContent() == null || req.getContent().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "评论内容不能为空"));
        }
        String content = req.getContent().trim();
        if (content.length() > 500) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "评论不能超过500字"));
        }
        if (SensitiveWordFilter.find(content) != null) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "评论内容包含违规词，请修改后重试"));
        }

        Comment c = new Comment();
        c.setImageId(req.getImageId());
        c.setUserId(userId);
        c.setContent(content);
        commentRepository.save(c);

        return ResponseEntity.ok(Map.of("code", 0, "data",
                toMap(c, resolveNames(Set.of(userId)), userId, isAdmin(auth))));
    }

    /** 删除评论（本人或管理员）。 */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        return commentRepository.findById(id)
                .map(c -> {
                    if (!isAdmin(auth) && !c.getUserId().equals(userId)) {
                        return ResponseEntity.status(403).body(Map.of("code", 403, "message", "无权限删除此评论"));
                    }
                    commentRepository.delete(c);
                    return ResponseEntity.ok(Map.of("code", 0, "message", "删除成功"));
                })
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "评论不存在")));
    }

    /** 将评论实体转换为返回给前端的 Map。 */
    private Map<String, Object> toMap(Comment c, Map<Long, String> names, Long viewerId, boolean isAdmin) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("imageId", c.getImageId());
        m.put("content", c.getContent());
        m.put("username", names.getOrDefault(c.getUserId(), "匿名"));
        if (isAdmin) {
            m.put("userId", c.getUserId());
        }
        m.put("isOwner", viewerId != null && viewerId.equals(c.getUserId()));
        m.put("createdAt", c.getCreatedAt());
        return m;
    }

    /** 批量解析用户 ID 为用户名，避免 N+1 查询。 */
    private Map<Long, String> resolveNames(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) return Collections.emptyMap();
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId,
                        u -> u.getUsername() == null ? "匿名" : u.getUsername()));
    }

    /** 判断当前登录用户是否为管理员。 */
    private static boolean isAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    @Data
    public static class CreateCommentRequest {
        private Long imageId;
        private String content;
    }
}