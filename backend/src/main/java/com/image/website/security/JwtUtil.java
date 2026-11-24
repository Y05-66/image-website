package com.image.website.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;

/**
 * JWT 工具类：负责令牌的生成、解析与校验。
 */
@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration-ms:86400000}")
    private long expirationMs;

    /** 由密钥字符串构造签名用的 HMAC 密钥。 */
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    /** 生成 JWT：subject 为 userId，附带用户名、角色声明与过期时间。 */
    public String generateToken(Long userId, String username, String role) {
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("username", username)
                .claim("role", role == null ? "USER" : role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    /** 解析 Token 的声明载荷。 */
    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /** 解析 Token 中的用户 ID（subject）。 */
    public Long parseUserId(String token) {
        return Long.valueOf(parseClaims(token).getSubject());
    }

    /** 解析 Token 中的角色声明（缺失时返回 null）。 */
    public String parseRole(String token) {
        Object role = parseClaims(token).get("role");
        return role == null ? null : role.toString();
    }

    /** 校验 Token 签名与有效期是否合法。 */
    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}