package com.image.website.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 图片-标签关联的复合主键，作为 {@link ImageTag} 的嵌入 ID。
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ImageTagId implements Serializable {

    /** 图片 ID。 */
    @Column(name = "image_id")
    private Long imageId;

    /** 标签 ID。 */
    @Column(name = "tag_id")
    private Long tagId;

    /** 复合主键按两个字段组合判断相等。 */
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ImageTagId)) return false;
        ImageTagId that = (ImageTagId) o;
        return java.util.Objects.equals(imageId, that.imageId) && java.util.Objects.equals(tagId, that.tagId);
    }

    /** 哈希码基于两个字段组合计算，保证与 equals 一致。 */
    @Override
    public int hashCode() {
        return java.util.Objects.hash(imageId, tagId);
    }
}