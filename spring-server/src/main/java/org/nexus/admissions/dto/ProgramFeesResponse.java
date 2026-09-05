package org.nexus.admissions.dto;

import java.math.BigDecimal;
import java.util.List;

public record ProgramFeesResponse(
        String programCode,
        String programName,
        String facultySchool,
        String campus,
        String currency,
        List<FeeYear> years
) {

    public record FeeYear(
            Integer year,
            List<FeeSemester> semesters
    ) {}

    public record FeeSemester(
            String name,
            String termType,
            BigDecimal tuition,
            BigDecimal registration,
            BigDecimal examination,
            BigDecimal functional,
            BigDecimal ict,
            BigDecimal library,
            BigDecimal medical,
            BigDecimal accommodation,
            BigDecimal other,
            BigDecimal total
    ) {}
}