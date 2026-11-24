package com.image.website.controller;

import com.image.website.entity.Follow;
import com.image.website.entity.User;
import com.image.website.repository.FollowRepository;
import com.image.website.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 关注关系接口：关注、取消关注、关注状态查询及关注/粉丝列表。
 */
@RestController
@RequestMapping("/api/follows")
@RequiredArgsConstructor
public class FollowController {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;

    /** 关注用户。 */
    @PostMapping("/{targetUserId}")
    public ResponseEntity<?> follow(@PathVariable Long targetUserId, Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        if (userId.equals(targetUserId)) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "不能关注自己"));
        }
        if (!userRepository.existsById(targetUserId)) {
            return ResponseEntity.status(404).body(Map.of("code", 404, "message", "用户不存在"));
        }
        if (!followRepository.existsByFollowerIdAndFollowingId(userId, targetUserId)) {
            Follow f = new Follow();
            f.setFollowerId(userId);
            f.setFollowingId(targetUserId);
            followRepository.save(f);
        }
        return ResponseEntity.ok(Map.of("code", 0, "data", Map.of("isFollowing", true)));
    }

    /** 取消关注。 */
    @DeleteMapping("/{targetUserId}")
    public ResponseEntity<?> unfollow(@PathVariable Long targetUserId, Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        followRepository.findByFollowerIdAndFollowingId(userId, targetUserId)
                .ifPresent(followRepository::delete);
        return ResponseEntity.ok(Map.of("code", 0, "data", Map.of("isFollowing", false)));
    }

    /** 查询是否已关注某用户。 */
    @GetMapping("/{targetUserId}/status")
    public ResponseEntity<?> status(@PathVariable Long targetUserId, Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        boolean isFollowing = followRepository.existsByFollowerIdAndFollowingId(userId, targetUserId);
        return ResponseEntity.ok(Map.of("code", 0, "data", Map.of("isFollowing", isFollowing)));
    }

    /** 我的关注列表。 */
    @GetMapping("/following")
    public ResponseEntity<?> following(Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        List<Long> ids = followRepository.findByFollowerId(userId).stream()
                .map(Follow::getFollowingId).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("code", 0, "data", userMap(ids)));
    }

    /** 我的粉丝列表。 */
    @GetMapping("/followers")
    public ResponseEntity<?> followers(Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        List<Long> ids = followRepository.findByFollowingId(userId).stream()
                .map(Follow::getFollowerId).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("code", 0, "data", userMap(ids)));
    }

    /** 批量将用户 ID 转换为用户信息列表。 */
    private List<Map<String, Object>> userMap(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) return Collections.emptyList();
        return userRepository.findAllById(ids).stream()
                .map(u -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", u.getId());
                    m.put("username", u.getUsername());
                    m.put("avatar", u.getAvatar());
                    return m;
                })
                .collect(Collectors.toList());
    }
}