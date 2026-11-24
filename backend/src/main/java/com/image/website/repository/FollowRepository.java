package com.image.website.repository;

import com.image.website.entity.Follow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 关注关系数据访问接口。
 */
@Repository
public interface FollowRepository extends JpaRepository<Follow, Long> {
    /** 按关注者与被关注者查询关注关系。 */
    Optional<Follow> findByFollowerIdAndFollowingId(Long followerId, Long followingId);
    /** 判断关注关系是否存在。 */
    boolean existsByFollowerIdAndFollowingId(Long followerId, Long followingId);
    /** 查询某用户关注的所有人。 */
    List<Follow> findByFollowerId(Long followerId);
    /** 查询关注某用户的所有人。 */
    List<Follow> findByFollowingId(Long followingId);
    /** 统计某用户的粉丝数。 */
    long countByFollowingId(Long followingId);
    /** 统计某用户的关注数。 */
    long countByFollowerId(Long followerId);
}