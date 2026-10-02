package org.nexus.admissions.configuration;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;
import org.nexus.admissions.model.Admin;
import org.nexus.admissions.service.AdminService;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final AdminService adminService;

    public JwtAuthFilter(JwtUtil jwtUtil, AdminService adminService) {
        this.jwtUtil = jwtUtil;
        this.adminService = adminService;
    }

    /**
     * A token is stale when it was issued before the admin's password was last
     * changed. Comparing against that instant (rather than maintaining a token
     * blacklist) keeps the JWT stateless while still letting a password change
     * end every session that predates it.
     */
    private boolean isStale(Long adminId, Date issuedAt) {
        LocalDateTime changedAt = adminService.findById(adminId)
                .map(Admin::getPasswordChangedAt)
                .orElse(null);
        if (changedAt == null) {
            return false;
        }
        return issuedAt.toInstant().isBefore(changedAt.atZone(ZoneId.systemDefault()).toInstant());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        String preview = "null";
        if (header != null) {
            preview = header.length() >= 7
                    ? "present (Bearer " + header.substring(7, Math.min(header.length(), 27)) + "...)"
                    : "present (short, len=" + header.length() + ")";
        }
        System.out.println("[AUTH-FILTER] " + request.getMethod() + " " + request.getRequestURI() + " | Authorization header: " + preview);

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            boolean valid = jwtUtil.isValid(token);
            if (valid) {
                Long adminId = jwtUtil.getAdminId(token);
                if (isStale(adminId, jwtUtil.getIssuedAt(token))) {
                    // Password changed after this token was minted: reject it so
                    // every other signed-in device is forced to log in again.
                    System.out.println("[AUTH-FILTER] Token rejected: issued before last password change");
                    valid = false;
                } else {
                    String email = jwtUtil.getEmail(token);
                    AdminPrincipal principal = new AdminPrincipal(adminId, email);
                    var authorities = List.of(new SimpleGrantedAuthority("ROLE_ADMIN"));
                    var auth = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
            if (!valid) {
                System.out.println("[AUTH-FILTER] Token invalid, expired, or superseded by a password change");
            }
        } else {
            System.out.println("[AUTH-FILTER] No Bearer token");
        }

        filterChain.doFilter(request, response);
    }

    public record AdminPrincipal(Long id, String email) {
    }
}
