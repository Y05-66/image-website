package com.image.website.controller;

import com.image.website.entity.User;
import com.image.website.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 用户接口：按用户名查询公开资料，以及管理员重置用户密码。
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /** 按用户名查询公开资料（用于关注作者、展示头像等）。 */
    @GetMapping("/{username}")
    public ResponseEntity<?> findByUsername(@PathVariable String username) {
        return userRepository.findByUsername(username)
                .map(u -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", u.getId());
                    m.put("username", u.getUsername());
                    m.put("avatar", u.getAvatar());
                    return ResponseEntity.ok(Map.of("code", 0, "data", m));
                })
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("code", 404, "message", "用户不存在")));
    }

    /** 重置用户密码（仅管理员，用于用户忘记密码后的兜底）。 */
    @PostMapping("/{username}/reset-password")
    public ResponseEntity<?> resetPassword(
            @PathVariable String username,
            @Valid @RequestBody ResetPasswordRequest req,
            Authentication auth) {
        if (!isAdmin(auth)) {
            return ResponseEntity.status(403).body(Map.of("code", 403, "message", "仅管理员可重置密码"));
        }
        return userRepository.findByUsername(username)
                .map(u -> {
                    u.setPassword(passwordEncoder.encode(req.getNewPassword()));
                    userRepository.save(u);
                    return ResponseEntity.ok(Map.of("code", 0, "message", "已重置用户「" + username + "」的密码"));
                })
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "用户不存在")));
    }

    /** 判断当前登录用户是否为管理员。 */
    private static boolean isAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    @Data
    public static class ResetPasswordRequest {
        @NotBlank @Size(min = 6) private String newPassword;
    }
}