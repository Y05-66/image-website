package com.image.website;

import com.image.website.config.EnvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 应用启动入口：先加载 .env 环境变量，再启动 Spring Boot。
 */
@SpringBootApplication
public class ImageWebsiteApplication {

    /** 程序入口。 */
    public static void main(String[] args) {
        EnvLoader.load();
        SpringApplication.run(ImageWebsiteApplication.class, args);
    }
}