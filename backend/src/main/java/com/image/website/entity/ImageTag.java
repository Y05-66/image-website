package com.image.website.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 图片-标签多对多关联实体，对应数据库 image_tags 表，通过复合主键关联图片与标签。
 */
@Entity
@Table(name = "image_tags",
       uniqueConstraints = @UniqueConstraint(columnNames = {"image_id", "tag_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ImageTag {

    /** 复合主键（imageId + tagId）。 */
    @EmbeddedId
    private ImageTagId id;

    /** 关联的图片。 */
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("imageId")
    @JoinColumn(name = "image_id")
    private Image image;

    /** 关联的标签。 */
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("tagId")
    @JoinColumn(name = "tag_id")
    private Tag tag;
}