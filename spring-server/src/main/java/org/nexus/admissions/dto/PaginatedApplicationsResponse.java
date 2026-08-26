package org.nexus.admissions.dto;

import java.util.List;

public record PaginatedApplicationsResponse(
        List<ApplicationResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {}
