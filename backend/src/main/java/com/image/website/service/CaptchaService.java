package com.image.website.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 图片验证码服务：生成四位（数字+字母）验证码图片，并做一次性校验。
 */
@Slf4j
@Service
public class CaptchaService {

    /** 去除易混淆字符（0/O、1/I/L）的数字+字母字符集。 */
    private static final String CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    private static final int LENGTH = 4;
    private static final long TTL_MILLIS = 5 * 60 * 1000L;

    private final Map<String, CaptchaEntry> store = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public record CaptchaData(String id, String image) {}

    /** 生成验证码：随机四位字符，存入内存并返回图片与唯一 ID。 */
    public CaptchaData generate() {
        String code = randomCode();
        String id = UUID.randomUUID().toString().replace("-", "");
        store.put(id, new CaptchaEntry(code, System.currentTimeMillis() + TTL_MILLIS));
        return new CaptchaData(id, "data:image/png;base64," + renderImage(code));
    }

    /** 校验验证码：大小写不敏感，校验通过即销毁（一次性），5 分钟未用则过期。 */
    public boolean validate(String id, String code) {
        if (id == null || code == null || code.isBlank()) {
            return false;
        }
        CaptchaEntry entry = store.get(id);
        if (entry == null) {
            return false;
        }
        if (System.currentTimeMillis() > entry.expiresAt) {
            store.remove(id);
            return false;
        }
        boolean ok = entry.code.equalsIgnoreCase(code.trim());
        if (ok) {
            store.remove(id);
        }
        return ok;
    }

    /** 随机生成四位不含易混淆字符的验证码文本。 */
    private String randomCode() {
        StringBuilder sb = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            sb.append(CHARS.charAt(random.nextInt(CHARS.length())));
        }
        return sb.toString();
    }

    /** 将验证码渲染为带干扰点、干扰线且字符随机倾斜的 PNG 图片（Base64）。 */
    private String renderImage(String code) {
        int width = 120;
        int height = 40;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        // 背景
        g.setColor(new Color(246, 248, 251));
        g.fillRect(0, 0, width, height);

        // 干扰点
        for (int i = 0; i < 90; i++) {
            g.setColor(new Color(random.nextInt(255), random.nextInt(255), random.nextInt(255)));
            g.fillRect(random.nextInt(width), random.nextInt(height), 1, 1);
        }

        // 干扰线
        g.setStroke(new BasicStroke(1f));
        for (int i = 0; i < 5; i++) {
            g.setColor(new Color(random.nextInt(200), random.nextInt(200), random.nextInt(200), 120));
            g.drawLine(random.nextInt(width), random.nextInt(height),
                    random.nextInt(width), random.nextInt(height));
        }

        // 字符
        int charWidth = width / (code.length() + 2);
        int baseline = height - 9;
        for (int i = 0; i < code.length(); i++) {
            String ch = String.valueOf(code.charAt(i));
            g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 26 + random.nextInt(6)));
            g.setColor(new Color(random.nextInt(60), random.nextInt(60), random.nextInt(120) + 40));
            double angle = (random.nextInt(31) - 15) * Math.PI / 180.0;
            int x = charWidth * (i + 1) + random.nextInt(4);
            AffineTransform old = g.getTransform();
            g.rotate(angle, x, baseline);
            g.drawString(ch, x, baseline);
            g.setTransform(old);
        }

        g.dispose();

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", baos);
            return Base64.getEncoder().encodeToString(baos.toByteArray());
        } catch (IOException e) {
            log.warn("Failed to render captcha image", e);
            throw new IllegalStateException("生成验证码失败", e);
        }
    }

    private static class CaptchaEntry {
        final String code;
        final long expiresAt;

        CaptchaEntry(String code, long expiresAt) {
            this.code = code;
            this.expiresAt = expiresAt;
        }
    }
}