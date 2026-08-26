package org.nexus.admissions.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "nap.backend")
public record NapBackendProperties(String baseUrl) {
}
