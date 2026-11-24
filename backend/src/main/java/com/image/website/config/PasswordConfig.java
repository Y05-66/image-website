package com.image.website.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * 密码加密配置：使用 BCrypt 对用户密码进行单向哈希，避免明文存储。
 */
@Configuration
public class PasswordConfig {

    /** 提供 BCrypt 密码编码器 Bean。 */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}