package org.nexus.admissions.configuration;

import java.util.List;
import java.util.Locale;
import org.nexus.admissions.exception.UnauthorizedException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class NexusIdentityTokenVerifier {

    private final String issuerUri;
    private final String clientId;
    private final String audience;
    private volatile JwtDecoder decoder;

    public NexusIdentityTokenVerifier(
            @Value("${nexus-identity.issuer-uri:}") String issuerUri,
            @Value("${nexus-identity.client-id:}") String clientId,
            @Value("${nexus-identity.audience:}") String audience) {
        this.issuerUri = issuerUri;
        this.clientId = clientId;
        this.audience = audience;
    }

    public String verifiedAdminEmail(String authorization) {
        if (issuerUri.isBlank() || clientId.isBlank() || audience.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Nexus Identity SSO is not configured");
        }
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new UnauthorizedException("A Nexus Identity bearer token is required");
        }

        try {
            Jwt jwt = decoder().decode(authorization.substring(7));
            String email = jwt.getClaimAsString("email");
            List<String> roles = jwt.getClaimAsStringList("roles");
            if (!clientId.equals(jwt.getClaimAsString("azp"))
                    || !jwt.getAudience().contains(audience)
                    || !"access".equals(jwt.getClaimAsString("token_use"))
                    || !Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"))
                    || roles == null
                    || roles.stream().noneMatch(role ->
                            role.equals("ADMISSIONS_OFFICER")
                                    || role.equals("ADMISSIONS_ADMIN")
                                    || role.equals("SYSTEM_ADMIN"))
                    || email == null
                    || email.isBlank()) {
                throw new UnauthorizedException("A verified admissions administrator identity is required");
            }
            return email.trim().toLowerCase(Locale.ROOT);
        } catch (JwtException exception) {
            throw new UnauthorizedException("The Nexus Identity token is invalid or expired");
        }
    }

    private JwtDecoder decoder() {
        JwtDecoder current = decoder;
        if (current == null) {
            synchronized (this) {
                current = decoder;
                if (current == null) {
                    current = JwtDecoders.fromIssuerLocation(issuerUri);
                    decoder = current;
                }
            }
        }
        return current;
    }
}
