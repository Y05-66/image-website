package com.image.website.controller;

import com.image.website.entity.Board;
import com.image.website.repository.BoardRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 收藏夹接口：列表、创建、详情、增删图片与删除收藏夹。
 */
@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {

    private final BoardRepository boardRepository;

    /** 我的收藏夹列表。 */
    @GetMapping
    public ResponseEntity<?> list(Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        List<Map<String, Object>> items = boardRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("code", 0, "data", items));
    }

    /** 创建收藏夹。 */
    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateBoardRequest req, Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        if (req.getName() == null || req.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "收藏夹名称不能为空"));
        }
        String name = req.getName().trim();
        if (name.length() > 100) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "收藏夹名称不能超过100字"));
        }

        Board board = new Board();
        board.setUserId(userId);
        board.setName(name);
        board.setDescription(req.getDescription());
        boardRepository.save(board);
        return ResponseEntity.ok(Map.of("code", 0, "data", toMap(board)));
    }

    /** 收藏夹详情。 */
    @GetMapping("/{id}")
    public ResponseEntity<?> detail(@PathVariable Long id, Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        return boardRepository.findById(id)
                .map(b -> b.getUserId().equals(userId)
                        ? ResponseEntity.ok(Map.of("code", 0, "data", toMap(b)))
                        : ResponseEntity.status(403).body(Map.of("code", 403, "message", "无权访问该收藏夹")))
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "收藏夹不存在")));
    }

    /** 添加图片到收藏夹。 */
    @PostMapping("/{id}/images")
    public ResponseEntity<?> addImage(@PathVariable Long id,
                                      @RequestBody Map<String, Long> body, Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        Long imageId = body.get("imageId");
        if (imageId == null) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "缺少图片ID"));
        }
        return boardRepository.findById(id)
                .map(b -> {
                    if (!b.getUserId().equals(userId)) {
                        return ResponseEntity.status(403).body(Map.of("code", 403, "message", "无权操作该收藏夹"));
                    }
                    b.getImageIds().add(imageId);
                    boardRepository.save(b);
                    return ResponseEntity.ok(Map.of("code", 0, "data", toMap(b)));
                })
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "收藏夹不存在")));
    }

    /** 从收藏夹移除图片。 */
    @DeleteMapping("/{id}/images/{imageId}")
    public ResponseEntity<?> removeImage(@PathVariable Long id,
                                         @PathVariable Long imageId, Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        return boardRepository.findById(id)
                .map(b -> {
                    if (!b.getUserId().equals(userId)) {
                        return ResponseEntity.status(403).body(Map.of("code", 403, "message", "无权操作该收藏夹"));
                    }
                    b.getImageIds().remove(imageId);
                    boardRepository.save(b);
                    return ResponseEntity.ok(Map.of("code", 0, "data", toMap(b)));
                })
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "收藏夹不存在")));
    }

    /** 删除收藏夹。 */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        return boardRepository.findById(id)
                .map(b -> {
                    if (!b.getUserId().equals(userId)) {
                        return ResponseEntity.status(403).body(Map.of("code", 403, "message", "无权操作该收藏夹"));
                    }
                    boardRepository.delete(b);
                    return ResponseEntity.ok(Map.of("code", 0, "message", "删除成功"));
                })
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "收藏夹不存在")));
    }

    /** 将收藏夹实体转换为返回给前端的 Map。 */
    private Map<String, Object> toMap(Board b) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", b.getId());
        m.put("name", b.getName());
        m.put("description", b.getDescription());
        m.put("imageIds", new ArrayList<>(b.getImageIds()));
        m.put("imageCount", b.getImageIds().size());
        m.put("createdAt", b.getCreatedAt());
        return m;
    }

    @Data
    public static class CreateBoardRequest {
        private String name;
        private String description;
    }
}