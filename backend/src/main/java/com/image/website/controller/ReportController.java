package com.image.website.controller;

import com.image.website.entity.Report;
import com.image.website.repository.ReportRepository;
import com.image.website.repository.ImageRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 举报接口：提交举报、管理员查看待处理举报与处理举报。
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportRepository reportRepository;
    private final ImageRepository imageRepository;

    /** 提交举报。 */
    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateReportRequest req, Authentication auth) {
        Long reporterId = Long.valueOf(auth.getName());
        if (req.getImageId() == null) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "缺少图片ID"));
        }
        if (!imageRepository.existsById(req.getImageId())) {
            return ResponseEntity.status(404).body(Map.of("code", 404, "message", "图片不存在"));
        }
        if (reportRepository.existsByImageIdAndReporterId(req.getImageId(), reporterId)) {
            return ResponseEntity.status(409).body(Map.of("code", 409, "message", "您已举报过该图片"));
        }

        Report report = new Report();
        report.setImageId(req.getImageId());
        report.setReporterId(reporterId);
        report.setReason(req.getReason());
        reportRepository.save(report);
        return ResponseEntity.ok(Map.of("code", 0, "message", "举报已提交，感谢您的反馈"));
    }

    /** 待处理举报列表（仅管理员）。 */
    @GetMapping
    public ResponseEntity<?> list(@RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size,
                                  Authentication auth) {
        if (!isAdmin(auth)) {
            return ResponseEntity.status(403).body(Map.of("code", 403, "message", "仅管理员可查看举报列表"));
        }
        Page<Report> reports = reportRepository.findByStatusOrderByCreatedAtAsc(
                "PENDING", PageRequest.of(page, size));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("code", 0);
        result.put("data", reports.getContent().stream().map(this::toMap).toList());
        result.put("totalPages", reports.getTotalPages());
        result.put("totalElements", reports.getTotalElements());
        return ResponseEntity.ok(result);
    }

    /** 处理举报（仅管理员）。 */
    @PostMapping("/{id}/resolve")
    public ResponseEntity<?> resolve(@PathVariable Long id, Authentication auth) {
        if (!isAdmin(auth)) {
            return ResponseEntity.status(403).body(Map.of("code", 403, "message", "仅管理员可处理举报"));
        }
        return reportRepository.findById(id)
                .map(r -> {
                    r.setStatus("RESOLVED");
                    reportRepository.save(r);
                    return ResponseEntity.ok(Map.of("code", 0, "message", "已处理"));
                })
                .orElse(ResponseEntity.status(404).body(Map.of("code", 404, "message", "举报不存在")));
    }

    /** 将举报实体转换为返回给前端的 Map。 */
    private Map<String, Object> toMap(Report r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("imageId", r.getImageId());
        m.put("reporterId", r.getReporterId());
        m.put("reason", r.getReason());
        m.put("status", r.getStatus());
        m.put("createdAt", r.getCreatedAt());
        return m;
    }

    /** 判断当前登录用户是否为管理员。 */
    private static boolean isAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    @Data
    public static class CreateReportRequest {
        private Long imageId;
        private String reason;
    }
}