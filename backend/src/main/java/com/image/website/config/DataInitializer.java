package com.image.website.config;

import com.image.website.entity.Image;
import com.image.website.repository.ImageRepository;
import com.image.website.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * 应用启动时的数据初始化：
 * <ul>
 *   <li>用户表为空时创建默认管理员账号 admin / admin123；</li>
 *   <li>为历史图片补全 status 字段（旧数据默认视为已通过审核）。</li>
 * </ul>
 */
@Slf4j
@Configuration
public class DataInitializer {

    /** 应用启动后执行的初始化与数据迁移逻辑。 */
    @Bean
    public CommandLineRunner initData(UserRepository userRepository, ImageRepository imageRepository,
                                      PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.count() == 0) {
                com.image.website.entity.User admin = new com.image.website.entity.User();
                admin.setUsername("admin");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setEmail("admin@example.com");
                admin.setEnabled(true);
                admin.setRole("ADMIN");
                userRepository.save(admin);
                log.info("Default admin user created: admin / admin123");
            }

            // 迁移：为历史图片补全 status 字段（旧数据无该字段，默认视为已通过）
            long migrated = 0;
            for (Image img : imageRepository.findAll()) {
                if (img.getStatus() == null) {
                    img.setStatus("APPROVED");
                    imageRepository.save(img);
                    migrated++;
                }
            }
            if (migrated > 0) {
                log.info("Migrated {} legacy images to APPROVED status", migrated);
            }
        };
    }
}