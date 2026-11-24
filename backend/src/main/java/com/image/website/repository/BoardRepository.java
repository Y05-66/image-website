package com.image.website.repository;

import com.image.website.entity.Board;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 收藏夹数据访问接口。
 */
@Repository
public interface BoardRepository extends JpaRepository<Board, Long> {
    /** 按用户查询其收藏夹列表（按创建时间倒序）。 */
    List<Board> findByUserIdOrderByCreatedAtDesc(Long userId);
}