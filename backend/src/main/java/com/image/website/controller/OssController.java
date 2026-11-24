package com.image.website.controller;

import com.image.website.service.OssStsService;
import com.image.website.service.OssUploadService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;

import java.util.Map;

/**
 * OSS 上传接口：获取直传签名与后端代理上传。
 */
@RestController
@RequestMapping("/api/oss")
@RequiredArgsConstructor
public class OssController {

    private final OssStsService ossStsService;
    private final OssUploadService ossUploadService;

    /** 获取 OSS 直传所需的签名与凭证参数。 */
    @GetMapping("/upload-signature")
    public ResponseEntity<?> getUploadSignature(Authentication authentication) {
        try {
            Map<String, String> params = ossStsService.generatePostSignature();
            return ResponseEntity.ok(Map.of("code", 0, "data", params));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("code", 500, "message", "签名服务暂不可用: " + e.getMessage()));
        }
    }

    /** 后端代理上传：接收前端文件，直传 OSS 并返回 objectKey。 */
    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        try {
            String objectKey = ossUploadService.upload(file);
            return ResponseEntity.ok(Map.of("code", 0, "data", Map.of("objectKey", objectKey)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("code", 500, "message", "上传失败: " + e.getMessage()));
        }
    }
}