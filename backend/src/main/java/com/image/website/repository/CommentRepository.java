package com.image.website.repository;

import com.image.website.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 评论数据访问接口。
 */
@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    /** 分页查询某图片的评论（按创建时间倒序）。 */
    Page<Comment> findByImageIdOrderByCreatedAtDesc(Long imageId, Pageable pageable);

    /** 查询某图片的全部评论。 */
    List<Comment> findByImageId(Long imageId);

    /** 统计某图片的评论数。 */
    long countByImageId(Long imageId);
}