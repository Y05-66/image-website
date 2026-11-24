package com.image.website.service;

import com.image.website.entity.User;
import com.image.website.repository.UserRepository;
import com.image.website.security.JwtUtil;
import com.image.website.util.SensitiveWordFilter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * 认证服务：负责注册、登录、找回密码、个人资料查询与修改。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    /** 注册新用户：校验用户名唯一与密码长度，密码使用 BCrypt 加密后入库。 */
    public Map<String, Object> register(String username, String password, String email) {
        String name = username == null ? "" : username.trim();
        if (name.length() < 2) {
            return Map.of("code", 400, "message", "用户名至少2个字符");
        }
        if (userRepository.existsByUsername(name)) {
            return Map.of("code", 400, "message", "用户名已存在");
        }
        if (SensitiveWordFilter.find(name) != null) {
            return Map.of("code", 400, "message", "用户名包含违规词，请修改后重试");
        }
        if (password == null || password.length() < 6) {
            return Map.of("code", 400, "message", "密码长度至少6位");
        }

        User user = new User();
        user.setUsername(name);
        user.setPassword(passwordEncoder.encode(password));
        user.setEmail(email);
        user.setEnabled(true);
        user.setRole("USER");
        userRepository.save(user);

        return Map.of("code", 0, "message", "注册成功");
    }

    /** 登录：校验用户名密码，成功后签发 JWT 并返回用户信息。 */
    public Map<String, Object> login(String username, String password) {
        User user = userRepository.findByUsername(username)
                .orElse(null);
        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            return Map.of("code", 401, "message", "用户名或密码错误");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole());
        return Map.of("code", 0, "data", Map.of(
                "token", token,
                "userId", user.getId(),
                "username", user.getUsername(),
                "email", emailOf(user),
                "role", user.getRole(),
                "avatar", avatarOf(user)
        ));
    }

    /** 轻量找回密码：校验用户名 + 绑定邮箱一致后重置密码。 */
    public Map<String, Object> resetPassword(String username, String email, String newPassword) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            // 与“邮箱不匹配”返回相同提示，避免暴露用户名是否存在（防用户名枚举）
            return Map.of("code", 400, "message", "用户名或邮箱不匹配，请核对后重试");
        }
        String boundEmail = user.getEmail() == null ? "" : user.getEmail().trim();
        if (boundEmail.isEmpty()) {
            return Map.of("code", 400, "message", "该账号未绑定邮箱，无法通过邮箱找回密码");
        }
        if (email == null || !email.trim().equalsIgnoreCase(boundEmail)) {
            return Map.of("code", 400, "message", "用户名或邮箱不匹配，请核对后重试");
        }
        if (newPassword == null || newPassword.length() < 6) {
            return Map.of("code", 400, "message", "新密码长度至少6位");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return Map.of("code", 0, "message", "密码重置成功，请使用新密码登录");
    }

    /** 查询当前用户信息（不含令牌）。 */
    public Map<String, Object> getProfile(Long userId) {
        return userRepository.findById(userId)
                .map(u -> Map.<String, Object>of(
                        "code", 0,
                        "data", Map.of(
                                "userId", u.getId(),
                                "username", u.getUsername(),
                                "email", emailOf(u),
                                "role", u.getRole(),
                                "avatar", avatarOf(u)
                        )
                ))
                .orElse(Map.of("code", 404, "message", "用户不存在"));
    }

    /** 修改用户名/邮箱/头像，用户名变更时重新签发令牌。 */
    public Map<String, Object> updateProfile(Long userId, String newUsername, String newEmail, String newAvatar) {
        return userRepository.findById(userId)
                .map(user -> {
                    if (newUsername != null && !newUsername.equals(user.getUsername())) {
                        if (SensitiveWordFilter.find(newUsername) != null) {
                            return Map.<String, Object>of("code", 400, "message", "用户名包含违规词，请修改后重试");
                        }
                        if (userRepository.existsByUsername(newUsername)) {
                            return Map.<String, Object>of("code", 400, "message", "用户名已存在");
                        }
                        user.setUsername(newUsername);
                    }
                    if (newEmail != null) {
                        user.setEmail(newEmail.trim());
                    }
                    if (newAvatar != null) {
                        user.setAvatar(newAvatar.trim().isEmpty() ? "" : newAvatar.trim());
                    }
                    userRepository.save(user);
                    String token = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole());
                    return Map.of("code", 0, "data", Map.of(
                            "token", token,
                            "userId", user.getId(),
                            "username", user.getUsername(),
                            "email", emailOf(user),
                            "role", user.getRole(),
                            "avatar", avatarOf(user)
                    ));
                })
                .orElse(Map.of("code", 404, "message", "用户不存在"));
    }

    /** 返回用户头像地址（为空时返回空串）。 */
    private static String avatarOf(User u) {
        return u.getAvatar() == null ? "" : u.getAvatar();
    }

    /** 返回用户邮箱（为空时返回空串）。 */
    private static String emailOf(User u) {
        return u.getEmail() == null ? "" : u.getEmail();
    }
}