package com.image.website.controller;

import com.image.website.service.CaptchaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 验证码接口：生成四位数字+字母的图片验证码（Base64），并返回其唯一 ID 供登录校验。
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CaptchaController {

    private final CaptchaService captchaService;

    /** 生成验证码，返回 captchaId 与 Base64 图片数据。 */
    @GetMapping("/captcha")
    public ResponseEntity<?> captcha() {
        CaptchaService.CaptchaData data = captchaService.generate();
        return ResponseEntity.ok(Map.of("code", 0, "data", Map.of(
                "captchaId", data.id(),
                "image", data.image()
        )));
    }
}