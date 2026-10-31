package org.nexus.admissions.configuration;

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
public class KeycloakTokenVerifier {

    private final String issuerUri;
    private final String clientId;
    private volatile JwtDecoder decoder;

    public KeycloakTokenVerifier(
            @Value("${keycloak.issuer-uri:}") String issuerUri,
            @Value("${keycloak.client-id:}") String clientId) {
        this.issuerUri = issuerUri;
        this.clientId = clientId;
    }

    public String verifiedEmail(String authorization) {
        if (issuerUri.isBlank() || clientId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "SSO is not configured");
        }
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new UnauthorizedException("A Keycloak bearer token is required");
        }

        try {
            Jwt jwt = decoder().decode(authorization.substring(7));
            String email = jwt.getClaimAsString("email");
            if (!clientId.equals(jwt.getClaimAsString("azp"))
                    || !Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"))
                    || email == null
                    || email.isBlank()) {
                throw new UnauthorizedException("The Keycloak identity is not verified for this application");
            }
            return email.trim().toLowerCase(java.util.Locale.ROOT);
        } catch (JwtException exception) {
            throw new UnauthorizedException("The Keycloak token is invalid or expired");
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
