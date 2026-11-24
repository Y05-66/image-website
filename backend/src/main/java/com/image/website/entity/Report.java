package com.image.website.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * 举报实体，对应数据库 reports 表，记录用户对图片的举报信息。
 */
@Entity
@Table(name = "reports")
@Getter
@Setter
@NoArgsConstructor
public class Report {

    /** 主键，自增。 */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 被举报的图片 ID。 */
    @Column(nullable = false)
    private Long imageId;

    /** 举报人用户 ID。 */
    @Column(nullable = false)
    private Long reporterId;

    /** 举报原因。 */
    @Column(length = 300)
    private String reason;

    // PENDING=待处理，RESOLVED=已处理
    @Column(length = 20)
    private String status = "PENDING";

    /** 举报时间，创建后不可修改。 */
    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}