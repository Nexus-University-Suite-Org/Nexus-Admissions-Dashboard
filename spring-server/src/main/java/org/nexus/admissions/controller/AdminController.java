package org.nexus.admissions.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.nexus.admissions.configuration.JwtAuthFilter;
import org.nexus.admissions.dto.AdminLoginRequest;
import org.nexus.admissions.dto.AdminLoginResponse;
import org.nexus.admissions.dto.ApplicationResponse;
import org.nexus.admissions.dto.DashboardStatsResponse;
import org.nexus.admissions.dto.PaginatedApplicationsResponse;
import org.nexus.admissions.dto.ReviewRequest;
import org.nexus.admissions.facade.AdminFacade;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final AdminFacade adminFacade;

    public AdminController(AdminFacade adminFacade) {
        this.adminFacade = adminFacade;
    }

    @PostMapping("/auth/login")
    public ResponseEntity<AdminLoginResponse> login(@Valid @RequestBody AdminLoginRequest request) {
        return ResponseEntity.ok(adminFacade.login(request));
    }

    @GetMapping("/auth/me")
    public ResponseEntity<AdminLoginResponse> me(Authentication authentication) {
        System.out.println("[ADMIN-CONTROLLER] /auth/me called | authentication=" + authentication);
        JwtAuthFilter.AdminPrincipal principal = (JwtAuthFilter.AdminPrincipal) authentication.getPrincipal();
        System.out.println("[ADMIN-CONTROLLER] principal: id=" + principal.id() + ", email=" + principal.email());
        AdminLoginResponse response = adminFacade.me(principal.id());
        System.out.println("[ADMIN-CONTROLLER] /auth/me returning: email=" + response.email() + ", fullName=" + response.fullName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/dashboard/stats")
    public ResponseEntity<DashboardStatsResponse> dashboardStats() {
        return ResponseEntity.ok(adminFacade.getDashboardStats());
    }

    @GetMapping("/applications")
    public ResponseEntity<PaginatedApplicationsResponse> getApplications(
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(adminFacade.getApplications(status, search, page, size));
    }

    @GetMapping("/applications/recent")
    public ResponseEntity<List<ApplicationResponse>> getRecentApplications(
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(adminFacade.getRecentApplications(Math.min(limit, 10)));
    }

    @GetMapping("/applications/{id}")
    public ResponseEntity<ApplicationResponse> getApplication(@PathVariable Long id) {
        return ResponseEntity.ok(adminFacade.getApplicationById(id));
    }

    @PutMapping("/applications/{id}/review")
    public ResponseEntity<ApplicationResponse> reviewApplication(
            @PathVariable Long id,
            @Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.ok(adminFacade.reviewApplication(id, request));
    }

    @GetMapping("/site-settings")
    public ResponseEntity<List<Map<String, Object>>> getSiteSettings() {
        return ResponseEntity.ok(adminFacade.getSiteSettings());
    }

    @PutMapping("/site-settings")
    public ResponseEntity<Map<String, Object>> updateSiteSetting(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminFacade.updateSiteSetting(body.get("settingKey"), body.get("settingValue")));
    }
}
