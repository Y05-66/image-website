package com.image.website.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * 评论实体，对应数据库 comments 表。
 */
@Entity
@Table(name = "comments")
@Getter
@Setter
@NoArgsConstructor
public class Comment {

    /** 主键，自增。 */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 被评论的图片 ID。 */
    @Column(nullable = false)
    private Long imageId;

    /** 发表评论的用户 ID。 */
    @Column(nullable = false)
    private Long userId;

    /** 评论内容。 */
    @Column(nullable = false, length = 500)
    private String content;

    /** 创建时间，创建后不可修改。 */
    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}