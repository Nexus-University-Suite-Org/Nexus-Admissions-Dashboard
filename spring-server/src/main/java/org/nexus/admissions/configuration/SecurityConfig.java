package org.nexus.admissions.configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, exception) ->
                                writeProblem(response, HttpStatus.UNAUTHORIZED,
                                        "Unauthorized", "A valid bearer token is required"))
                        .accessDeniedHandler((request, response, denied) ->
                                writeProblem(response, HttpStatus.FORBIDDEN,
                                        "Forbidden", "Access denied")))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/admin/auth/login").permitAll()
                        .requestMatchers("/api/healthz").permitAll()
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/api/v1/admin/**").authenticated()
                        .anyRequest().permitAll()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Spring Security's default entry point answers an unauthenticated request
     * with 403, which reads as "you may not act as this user" rather than "your
     * credentials are missing or no longer valid". Clients cannot tell those
     * apart, so an expired session looked like a permissions problem instead of
     * a reason to send the user back to the login screen. Both entry point and
     * access-denied handler write the same RFC 9457 problem shape the rest of
     * the API uses.
     */
    private void writeProblem(HttpServletResponse response, HttpStatus status, String title, String detail)
            throws IOException {
        if (response.isCommitted()) {
            return;
        }
        response.reset();
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getOutputStream(), Map.of(
                "type", "about:blank",
                "title", title,
                "status", status.value(),
                "detail", detail,
                "error", detail));
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * Origins allowed to call this API. The defaults cover local Vite/preview
     * ports; CORS_ALLOWED_ORIGINS adds extra origins (comma-separated) so new
     * frontend ports don't require a code change.
     */
    private List<String> allowedOrigins() {
        List<String> origins = new ArrayList<>(List.of(
                "http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
                "http://localhost:5176", "http://localhost:5177", "http://localhost:5178", "http://localhost:5179",
                "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175",
                "http://127.0.0.1:5176", "http://127.0.0.1:5177", "http://127.0.0.1:5178", "http://127.0.0.1:5179",
                "http://localhost:4173", "http://127.0.0.1:4173",
                "http://localhost:18548", "http://127.0.0.1:18548"
        ));

        String extra = System.getenv("CORS_ALLOWED_ORIGINS");
        if (extra != null && !extra.isBlank()) {
            for (String origin : extra.split(",")) {
                String trimmed = origin.trim();
                if (!trimmed.isEmpty() && !origins.contains(trimmed)) {
                    origins.add(trimmed);
                }
            }
        }
        return origins;
    }
}
