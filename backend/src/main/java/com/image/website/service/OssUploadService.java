package com.image.website.service;

import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.model.ObjectMetadata;
import com.image.website.config.EnvLoader;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * 后端代理上传：前端把文件提交给本服务，由本服务使用 OSS SDK 上传，
 * 避免浏览器跨域直传 OSS 时的 CORS 限制。
 */
@Slf4j
@Service
public class OssUploadService {

    @Value("${oss.bucket}")
    private String bucket;

    @Value("${oss.region}")
    private String region;

    @Value("${oss.upload-dir}")
    private String uploadDir;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /** 上传文件到 OSS，返回 objectKey。 */
    public String upload(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("上传文件为空");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("只允许上传图片文件");
        }

        String akId = EnvLoader.get("OSS_ACCESS_KEY_ID");
        String akSecret = EnvLoader.get("OSS_ACCESS_KEY_SECRET");
        if (akId == null || akSecret == null) {
            throw new IllegalStateException("OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET 未配置");
        }

        String ext = extensionOf(file.getOriginalFilename());
        String objectKey = uploadDir + LocalDate.now().format(DATE_FMT)
                + "/" + UUID.randomUUID() + "." + ext;

        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(file.getSize());
        if (file.getContentType() != null) {
            metadata.setContentType(file.getContentType());
        }

        String endpoint = "https://oss-" + region + ".aliyuncs.com";
        OSS ossClient = new OSSClientBuilder().build(endpoint, akId, akSecret);
        try (InputStream in = file.getInputStream()) {
            ossClient.putObject(bucket, objectKey, in, metadata);
            log.info("Uploaded to OSS: {}/{}", bucket, objectKey);
        } finally {
            ossClient.shutdown();
        }
        return objectKey;
    }

    /** 从文件名提取扩展名（小写），无扩展名时默认 jpg。 */
    private static String extensionOf(String name) {
        if (name == null) return "jpg";
        int dot = name.lastIndexOf('.');
        return dot >= 0 ? name.substring(dot + 1).toLowerCase() : "jpg";
    }
}