package com.image.website.repository;

import com.image.website.entity.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 举报数据访问接口。
 */
@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    /** 按状态分页查询举报（按创建时间升序，最早的优先处理）。 */
    Page<Report> findByStatusOrderByCreatedAtAsc(String status, Pageable pageable);
    /** 判断某用户是否已举报过某图片。 */
    boolean existsByImageIdAndReporterId(Long imageId, Long reporterId);
}