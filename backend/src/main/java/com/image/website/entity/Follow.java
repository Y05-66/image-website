package com.image.website.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * 关注关系实体，对应数据库 follows 表，通过唯一约束保证同一关注关系不重复。
 */
@Entity
@Table(name = "follows", uniqueConstraints = @UniqueConstraint(columnNames = {"follower_id", "following_id"}))
@Getter
@Setter
@NoArgsConstructor
public class Follow {

    /** 主键，自增。 */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 关注者（发起关注的人）
    @Column(name = "follower_id", nullable = false)
    private Long followerId;

    // 被关注者
    @Column(name = "following_id", nullable = false)
    private Long followingId;

    /** 关注时间，创建后不可修改。 */
    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}