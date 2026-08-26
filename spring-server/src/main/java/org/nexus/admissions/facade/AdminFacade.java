package org.nexus.admissions.facade;

import jakarta.transaction.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.nexus.admissions.configuration.JwtUtil;
import org.nexus.admissions.dto.AdminLoginRequest;
import org.nexus.admissions.dto.AdminLoginResponse;
import org.nexus.admissions.dto.ApplicationResponse;
import org.nexus.admissions.dto.DashboardStatsResponse;
import org.nexus.admissions.dto.PaginatedApplicationsResponse;
import org.nexus.admissions.dto.ReviewRequest;
import org.nexus.admissions.mapper.ApplicationMapper;
import org.nexus.admissions.model.Admin;
import org.nexus.admissions.model.Application;
import org.nexus.admissions.service.AdminService;
import org.nexus.admissions.service.ApplicationService;
import org.springframework.data.domain.Page;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AdminFacade {

    private final AdminService adminService;
    private final ApplicationService applicationService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AdminFacade(AdminService adminService,
                       ApplicationService applicationService,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil) {
        this.adminService = adminService;
        this.applicationService = applicationService;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @Transactional
    public AdminLoginResponse login(AdminLoginRequest request) {
        Admin admin = adminService.findByEmail(request.email())
                .orElseThrow(() -> new RuntimeException("Invalid administrator credentials."));

        if (!passwordEncoder.matches(request.password(), admin.getPasswordHash())) {
            throw new RuntimeException("Invalid administrator credentials.");
        }

        String token = jwtUtil.generateToken(admin.getId(), admin.getEmail());
        return new AdminLoginResponse(token, admin.getEmail(), admin.getFullName());
    }

    @Transactional
    public AdminLoginResponse me(Long adminId) {
        Admin admin = adminService.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));
        return new AdminLoginResponse(null, admin.getEmail(), admin.getFullName());
    }

    @Transactional
    public DashboardStatsResponse getDashboardStats() {
        long total = applicationService.countAll();
        long pending = applicationService.countByStatus("SUBMITTED");
        long admitted = applicationService.countByStatus("ADMITTED");
        long rejected = applicationService.countByStatus("REJECTED");
        long waitlisted = applicationService.countByStatus("WAITLISTED");
        long draft = applicationService.countByStatus("DRAFT");

        Map<String, Long> monthlyTrend = new LinkedHashMap<>();
        LocalDateTime now = LocalDateTime.now();
        for (int i = 5; i >= 0; i--) {
            LocalDate month = now.minusMonths(i).toLocalDate();
            String key = month.format(DateTimeFormatter.ofPattern("MMM yyyy"));
            LocalDateTime startOfMonth = month.withDayOfMonth(1).atStartOfDay();
            LocalDateTime endOfMonth = month.withDayOfMonth(month.lengthOfMonth()).atTime(23, 59, 59);
            long count = applicationService.countAll();
            monthlyTrend.put(key, count);
        }

        return new DashboardStatsResponse(total, pending, admitted, rejected, waitlisted, draft, monthlyTrend);
    }

    @Transactional
    public PaginatedApplicationsResponse getApplications(String status, String search, int page, int size) {
        Page<Application> result = applicationService.findFiltered(status, search, page, size);
        List<ApplicationResponse> content = result.getContent().stream()
                .map(ApplicationMapper::toDto)
                .toList();
        return new PaginatedApplicationsResponse(
                content,
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        );
    }

    @Transactional
    public List<ApplicationResponse> getRecentApplications(int limit) {
        return applicationService.findRecent(limit).stream()
                .map(ApplicationMapper::toDto)
                .toList();
    }

    @Transactional
    public ApplicationResponse getApplicationById(Long id) {
        Application app = applicationService.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found."));
        return ApplicationMapper.toDto(app);
    }

    @Transactional
    public ApplicationResponse reviewApplication(Long id, ReviewRequest request) {
        Application app = applicationService.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found."));

        if (!"SUBMITTED".equals(app.getStatus())) {
            throw new RuntimeException("Only submitted applications can be reviewed.");
        }

        String reviewStatus = request.reviewStatus();
        app.setReviewStatus(reviewStatus.charAt(0) + reviewStatus.substring(1));
        app.setReviewerNotes(request.notes() != null ? request.notes() : null);
        app.setReviewedAt(LocalDateTime.now());

        switch (reviewStatus) {
            case "admitted" -> app.setStatus("ADMITTED");
            case "rejected" -> app.setStatus("REJECTED");
            case "waitlisted" -> app.setStatus("WAITLISTED");
            default -> throw new RuntimeException("Invalid review status: " + reviewStatus);
        }

        Application updated = applicationService.save(app);
        return ApplicationMapper.toDto(updated);
    }
}
