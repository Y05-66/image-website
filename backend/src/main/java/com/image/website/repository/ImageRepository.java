package com.image.website.repository;

import com.image.website.entity.Image;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * 图片数据访问接口，提供按上传者、标签、关键词、审核状态等维度的分页查询能力。
 */
@Repository
public interface ImageRepository extends JpaRepository<Image, Long> {

    // 悲观写锁：点赞/收藏等并发写操作前加锁，避免多个请求同时读到旧数据导致计数不准
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Image i WHERE i.id = :id")
    Optional<Image> findByIdForUpdate(@Param("id") Long id);

    // 原子自增浏览量（避免整行 save 覆盖并发修改）
    @Modifying
    @Query("UPDATE Image i SET i.views = i.views + 1 WHERE i.id = :id")
    void incrementViews(@Param("id") Long id);

    // 原子自增下载量
    @Modifying
    @Query("UPDATE Image i SET i.downloadCount = i.downloadCount + 1 WHERE i.id = :id")
    void incrementDownloadCount(@Param("id") Long id);

    // 按上传者筛选
    Page<Image> findByUploaderId(Long uploaderId, Pageable pageable);

    // 按标签筛选（使用JPQL查询tags集合）
    @Query("SELECT i FROM Image i JOIN i.tags t WHERE t = :tag ORDER BY i.createdAt DESC")
    Page<Image> findByTag(@Param("tag") String tag, Pageable pageable);

    // 搜索标题或描述
    @Query("SELECT i FROM Image i WHERE (i.title LIKE %:keyword% OR i.description LIKE %:keyword%) ORDER BY i.createdAt DESC")
    Page<Image> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    // 同时按标签和关键词搜索
    @Query("SELECT i FROM Image i JOIN i.tags t WHERE t = :tag AND (i.title LIKE %:keyword% OR i.description LIKE %:keyword%) ORDER BY i.createdAt DESC")
    Page<Image> findByTagAndKeyword(@Param("tag") String tag, @Param("keyword") String keyword, Pageable pageable);

    // 获取热门标签
    @Query("SELECT t FROM Image i JOIN i.tags t GROUP BY t ORDER BY COUNT(t) DESC")
    List<String> findTopTags(Pageable pageable);

    // 检查用户是否收藏
    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END FROM Image i JOIN i.favorites f WHERE i.id = :imageId AND f = :userId")
    boolean isFavorite(@Param("imageId") Long imageId, @Param("userId") Long userId);

    // 获取收藏数最多的图片
    @Query("SELECT i FROM Image i ORDER BY i.likeCount DESC")
    Page<Image> findMostLiked(Pageable pageable);

    // 获取某用户收藏的图片列表
    @Query("SELECT i FROM Image i JOIN i.favorites f WHERE f = :userId ORDER BY i.createdAt DESC")
    Page<Image> findByFavoritedBy(@Param("userId") Long userId, Pageable pageable);

    // 获取某用户点赞的图片列表
    @Query("SELECT i FROM Image i JOIN i.likedBy l WHERE l = :userId ORDER BY i.createdAt DESC")
    Page<Image> findByLikedBy(@Param("userId") Long userId, Pageable pageable);

    // ── 审核状态相关 ─────────────────────────────────────────────────
    // 按状态筛选（派生查询，Sort 会由 Pageable 自动应用）
    Page<Image> findByStatus(String status, Pageable pageable);

    // 按标签 + 状态筛选
    @Query("SELECT i FROM Image i JOIN i.tags t WHERE t = :tag AND i.status = :status ORDER BY i.createdAt DESC")
    Page<Image> findByTagAndStatus(@Param("tag") String tag, @Param("status") String status, Pageable pageable);

    // 关键词 + 状态搜索
    @Query("SELECT i FROM Image i WHERE (i.title LIKE %:keyword% OR i.description LIKE %:keyword%) AND i.status = :status ORDER BY i.createdAt DESC")
    Page<Image> searchByKeywordAndStatus(@Param("keyword") String keyword, @Param("status") String status, Pageable pageable);

    // 标签 + 关键词 + 状态搜索
    @Query("SELECT i FROM Image i JOIN i.tags t WHERE t = :tag AND (i.title LIKE %:keyword% OR i.description LIKE %:keyword%) AND i.status = :status ORDER BY i.createdAt DESC")
    Page<Image> findByTagAndKeywordAndStatus(@Param("tag") String tag, @Param("keyword") String keyword, @Param("status") String status, Pageable pageable);

    // 统一筛选：分类(可多选) + 标签(可多选) + 颜色(可多选) + 关键词 + 状态（任一条件为 null 即忽略该条件）
    @Query("SELECT i FROM Image i WHERE i.status = :status " +
           "AND (:categoryList IS NULL OR i.category IN :categoryList) " +
           "AND (:tagList IS NULL OR EXISTS (SELECT tg FROM Image i2 JOIN i2.tags tg WHERE i2.id = i.id AND tg IN :tagList)) " +
           "AND (:colorList IS NULL OR i.dominantColor IN :colorList) " +
           "AND (:keyword IS NULL OR i.title LIKE %:keyword% OR i.description LIKE %:keyword%)")
    Page<Image> searchImages(@Param("categoryList") List<String> categoryList,
                             @Param("tagList") List<String> tagList,
                             @Param("colorList") List<String> colorList,
                             @Param("keyword") String keyword,
                             @Param("status") String status,
                             Pageable pageable);

    // 热门标签（仅统计已通过图片）
    @Query("SELECT t FROM Image i JOIN i.tags t WHERE i.status = :status GROUP BY t ORDER BY COUNT(t) DESC")
    List<String> findTopTagsByStatus(@Param("status") String status, Pageable pageable);

    // ── 发现/推荐相关 ───────────────────────────────────────────────
    // 相关图片：按共同标签数量降序（排除自身，仅已通过）
    @Query("SELECT i, COUNT(t) AS common FROM Image i JOIN i.tags t " +
           "WHERE i.id <> :id AND i.status = 'APPROVED' AND t IN :tags " +
           "GROUP BY i ORDER BY common DESC, i.likeCount DESC")
    List<Object[]> findRelated(@Param("id") Long id, @Param("tags") Set<String> tags, Pageable pageable);

    // 排行榜：时间段内按点赞/浏览降序
    @Query("SELECT i FROM Image i WHERE i.status = 'APPROVED' AND i.createdAt >= :since ORDER BY i.likeCount DESC, i.views DESC")
    Page<Image> findRankingSince(@Param("since") Instant since, Pageable pageable);

    // 标签联想（仅已通过）
    @Query("SELECT DISTINCT t FROM Image i JOIN i.tags t WHERE i.status = 'APPROVED' AND t LIKE %:q%")
    List<String> findTagSuggestions(@Param("q") String q, Pageable pageable);

    // 标题联想（仅已通过）
    @Query("SELECT DISTINCT i.title FROM Image i WHERE i.status = 'APPROVED' AND i.title LIKE %:q%")
    List<String> findTitleSuggestions(@Param("q") String q, Pageable pageable);

    // 关注流：指定上传者集合的已通过图片
    Page<Image> findByUploaderIdInAndStatusOrderByCreatedAtDesc(List<Long> uploaderIds, String status, Pageable pageable);
}