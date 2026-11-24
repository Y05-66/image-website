package com.image.website.controller;

import com.image.website.service.AuthService;
import com.image.website.service.CaptchaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 认证相关接口：注册、登录、找回密码、当前用户信息查询与资料修改。
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final CaptchaService captchaService;

    /** 注册接口。 */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        Map<String, Object> result = authService.register(req.getUsername(), req.getPassword(), req.getEmail());
        int code = (int) result.get("code");
        return switch (code) {
            case 0 -> ResponseEntity.ok(result);
            default -> ResponseEntity.status(400).body(result);
        };
    }

    /** 登录接口（需先校验图形验证码）。 */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        if (!captchaService.validate(req.getCaptchaId(), req.getCaptchaCode())) {
            return ResponseEntity.status(400).body(Map.of("code", 400, "message", "验证码错误或已过期"));
        }
        Map<String, Object> result = authService.login(req.getUsername(), req.getPassword());
        int code = (int) result.get("code");
        return switch (code) {
            case 0 -> ResponseEntity.ok(result);
            case 401 -> ResponseEntity.status(401).body(result);
            default -> ResponseEntity.status(400).body(result);
        };
    }

    /** 轻量找回密码：校验用户名 + 绑定邮箱后直接重置密码。 */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        Map<String, Object> result = authService.resetPassword(req.getUsername(), req.getEmail(), req.getNewPassword());
        int code = (int) result.get("code");
        return switch (code) {
            case 0 -> ResponseEntity.ok(result);
            default -> ResponseEntity.status(400).body(result);
        };
    }

    /** 查询当前登录用户信息。 */
    @GetMapping("/me")
    public ResponseEntity<?> getMe(Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        return ResponseEntity.ok(authService.getProfile(userId));
    }

    /** 修改个人资料（用户名/邮箱/头像）。 */
    @PatchMapping("/me")
    public ResponseEntity<?> updateMe(@Valid @RequestBody UpdateMeRequest req, Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        Map<String, Object> result = authService.updateProfile(userId, req.getUsername(), req.getEmail(), req.getAvatar());
        int code = (int) result.get("code");
        return switch (code) {
            case 0 -> ResponseEntity.ok(result);
            default -> ResponseEntity.status(400).body(result);
        };
    }

    @Data
    public static class RegisterRequest {
        @NotBlank @Size(min = 2, max = 50) private String username;
        @NotBlank @Size(min = 6) private String password;
        @NotBlank @Email private String email;
    }

    @Data
    public static class LoginRequest {
        @NotBlank private String username;
        @NotBlank private String password;
        private String captchaId;
        private String captchaCode;
    }

    @Data
    public static class ForgotPasswordRequest {
        @NotBlank private String username;
        @NotBlank private String email;
        @NotBlank @Size(min = 6) private String newPassword;
    }

    @Data
    public static class UpdateMeRequest {
        @Size(min = 2, max = 50) private String username;
        @Email private String email;
        private String avatar;
    }
}