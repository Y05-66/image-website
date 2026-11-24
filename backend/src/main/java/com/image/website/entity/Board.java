package com.image.website.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * 收藏夹实体，对应数据库 boards 表，保存用户创建的收藏夹及其图片。
 */
@Entity
@Table(name = "boards")
@Getter
@Setter
@NoArgsConstructor
public class Board {

    /** 主键，自增。 */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 收藏夹所属用户 ID。 */
    @Column(nullable = false)
    private Long userId;

    /** 收藏夹名称。 */
    @Column(nullable = false, length = 100)
    private String name;

    /** 收藏夹描述。 */
    @Column(length = 300)
    private String description;

    /** 创建时间，创建后不可修改。 */
    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // 收藏夹内的图片ID（唯一约束保证同一收藏夹不重复）
    @ElementCollection
    @CollectionTable(
        name = "board_images",
        joinColumns = @JoinColumn(name = "board_id"),
        uniqueConstraints = @UniqueConstraint(columnNames = {"board_id", "image_id"})
    )
    @Column(name = "image_id", nullable = false)
    private Set<Long> imageIds = new LinkedHashSet<>();
}