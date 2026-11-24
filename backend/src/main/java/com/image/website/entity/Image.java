package com.image.website.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

/**
 * 图片实体，对应数据库 images 表，记录图片元数据与审核/互动统计信息。
 */
@Entity
@Table(name = "images")
@Getter
@Setter
@NoArgsConstructor
public class Image {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 512)
    private String objectKey;

    @Column(nullable = false, length = 1024)
    private String url;

    private Integer width;
    private Integer height;
    private Long fileSize;

    @Column(length = 32)
    private String format;

    @Column(nullable = false)
    private Long uploaderId;

    @Column(length = 200)
    private String title;

    // 图片类型（上传时必选其一）
    @Column(length = 32)
    private String category;

    @Column(length = 500)
    private String description;

    // 标签列表 — 使用独立表名避免与 ImageTag 多对多实体冲突
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "image_tag_values",
        joinColumns = @JoinColumn(name = "image_id")
    )
    @Column(name = "tag_name")
    private Set<String> tags = new HashSet<>();

    // 点赞数
    private int likeCount = 0;

    // 浏览量
    private int views = 0;

    // 下载量
    private int downloadCount = 0;

    // 主色调（十六进制，如 #aabbcc，用于颜色筛选与占位）
    @Column(length = 16)
    private String dominantColor;

    // 审核状态：APPROVED=已通过（公开可见），PENDING=待审核
    @Column(length = 20)
    private String status = "APPROVED";

    // 收藏者ID集合（唯一约束保证同一用户不能重复收藏）
    @BatchSize(size = 100)
    @ElementCollection
    @CollectionTable(
        name = "image_favorites",
        joinColumns = @JoinColumn(name = "image_id"),
        uniqueConstraints = @UniqueConstraint(columnNames = {"image_id", "user_id"})
    )
    @Column(name = "user_id", nullable = false)
    private Set<Long> favorites = new HashSet<>();

    // 点赞者ID集合（用于去重，防止无限刷赞）
    @BatchSize(size = 100)
    @ElementCollection
    @CollectionTable(
        name = "image_likes",
        joinColumns = @JoinColumn(name = "image_id"),
        uniqueConstraints = @UniqueConstraint(columnNames = {"image_id", "user_id"})
    )
    @Column(name = "user_id", nullable = false)
    private Set<Long> likedBy = new HashSet<>();

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    /**
     * 获取图片缩略图URL（OSS 处理样式：等比缩放至宽 400，输出 WebP，未指定高度则保持原始比例，
     * 不再强制正方形裁剪，避免裁掉主体内容）
     */
    public String getThumbUrl() {
        if (url == null || url.isBlank()) return url;
        String separator = url.contains("?") ? "&" : "?";
        return url + separator + "x-oss-process=image/resize,w_400/format,webp";
    }
}