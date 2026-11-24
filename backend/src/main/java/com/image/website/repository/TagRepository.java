package com.image.website.repository;

import com.image.website.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 标签数据访问接口。
 */
@Repository
public interface TagRepository extends JpaRepository<Tag, Long> {
    /** 按名称（忽略大小写）查询标签。 */
    Optional<Tag> findByNameIgnoreCase(String name);
}