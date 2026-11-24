package com.image.website.config;

import io.github.cdimascio.dotenv.Dotenv;
import io.github.cdimascio.dotenv.DotenvEntry;
import lombok.extern.slf4j.Slf4j;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;

/**
 * 统一的环境变量读取入口。
 *
 * <p>在 {@code main()} 中、Spring 上下文启动之前调用 {@link #load()}，
 * 把 {@code .env} 中的配置写入系统属性，这样 {@code @Value("${...}")}
 * 以及 {@link #get(String)} 都能读取到一致的值。</p>
 */
@Slf4j
public final class EnvLoader {

    private EnvLoader() {
    }

    /**
     * 定位并加载 {@code .env} 文件到系统属性。幂等，可重复调用。
     */
    public static void load() {
        Path envFile = locateEnvFile();
        if (envFile == null) {
            log.debug(".env file not found, using system properties / environment variables only");
            return;
        }

        try {
            Path parent = envFile.getParent();
            Dotenv dotenv = Dotenv.configure()
                    .directory(parent != null ? parent.toString() : ".")
                    .filename(envFile.getFileName().toString())
                    .ignoreIfMissing()
                    .load();

            Set<DotenvEntry> entries = dotenv.entries();
            int loaded = 0;
            for (DotenvEntry entry : entries) {
                // 已有系统属性(-D...)时优先保留，避免覆盖显式传入的参数
                if (System.getProperty(entry.getKey()) == null) {
                    System.setProperty(entry.getKey(), entry.getValue());
                    loaded++;
                }
            }
            log.info("Loaded {} variables from {}", loaded, envFile.toAbsolutePath().normalize());
        } catch (Exception e) {
            log.warn("Failed to load .env file {}: {}", envFile, e.getMessage());
        }
    }

    /**
     * 依次尝试多个候选目录，返回实际存在的 {@code .env} 文件路径。
     */
    private static Path locateEnvFile() {
        String userDir = System.getProperty("user.dir", ".");
        String[] candidates = {
                userDir + "/.env",
                userDir + "/../.env",
                userDir + "/backend/.env",
                userDir + "/../backend/.env",
        };
        for (String candidate : candidates) {
            try {
                Path path = Paths.get(candidate).toAbsolutePath().normalize();
                if (Files.isRegularFile(path)) {
                    return path;
                }
            } catch (Exception ignored) {
                // 继续尝试下一个候选目录
            }
        }
        return null;
    }

    /**
     * 优先读取系统属性，回退到系统环境变量。
     */
    public static String get(String key) {
        String value = System.getProperty(key);
        return value != null ? value : System.getenv(key);
    }
}