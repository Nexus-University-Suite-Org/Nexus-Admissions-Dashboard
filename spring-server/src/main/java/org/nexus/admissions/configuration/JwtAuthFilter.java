package org.nexus.admissions.configuration;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import org.nexus.admissions.model.Admin;
import org.nexus.admissions.service.AdminService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

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
     *
     * <p>Both sides are compared at whole-second resolution because that is all
     * a JWT {@code iat} carries; comparing at millisecond resolution would
     * reject the replacement token handed to the browser that just changed the
     * password.
     */
    private boolean isStale(Long adminId, Date issuedAt) {
        LocalDateTime changedAt = adminService.findById(adminId)
                .map(Admin::getPasswordChangedAt)
                .orElse(null);
        if (changedAt == null) {
            return false;
        }
        LocalDateTime issued = LocalDateTime.ofInstant(issuedAt.toInstant(), ZoneId.systemDefault())
                .truncatedTo(ChronoUnit.SECONDS);
        return issued.isBefore(changedAt.truncatedTo(ChronoUnit.SECONDS));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            boolean valid = jwtUtil.isValid(token);
            if (valid) {
                Long adminId = jwtUtil.getAdminId(token);
                Date issuedAt = jwtUtil.getIssuedAt(token);
                if (issuedAt == null || isStale(adminId, issuedAt)) {
                    // Password changed after this token was minted: reject it so
                    // every other signed-in device is forced to log in again.
                    // Leaving the context empty lets the entry point answer 401.
                    log.debug("Token superseded by a password change");
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
                log.debug("Token invalid, expired, or superseded by a password change");
            }
        }

        filterChain.doFilter(request, response);
    }

    public record AdminPrincipal(Long id, String email) {
    }
}
