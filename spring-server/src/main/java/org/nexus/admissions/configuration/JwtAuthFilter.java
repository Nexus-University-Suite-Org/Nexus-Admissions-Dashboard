package org.nexus.admissions.configuration;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
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
            System.out.println("[AUTH-FILTER] Token valid: " + valid);
            if (valid) {
                Long adminId = jwtUtil.getAdminId(token);
                String email = jwtUtil.getEmail(token);
                System.out.println("[AUTH-FILTER] Authenticated admin: id=" + adminId + ", email=" + email);

                AdminPrincipal principal = new AdminPrincipal(adminId, email);
                var authorities = List.of(new SimpleGrantedAuthority("ROLE_ADMIN"));
                var auth = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);
            } else {
                System.out.println("[AUTH-FILTER] Token invalid or expired");
            }
        } else {
            System.out.println("[AUTH-FILTER] No Bearer token");
        }

        filterChain.doFilter(request, response);
    }

    public record AdminPrincipal(Long id, String email) {
    }
}
