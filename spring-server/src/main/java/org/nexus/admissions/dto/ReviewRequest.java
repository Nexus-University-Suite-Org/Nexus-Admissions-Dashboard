package org.nexus.admissions.dto;

import jakarta.validation.constraints.NotBlank;

public record ReviewRequest(
        @NotBlank String reviewStatus,
        String notes
) {}
