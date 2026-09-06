package org.nexus.admissions.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import org.nexus.admissions.dto.StudentProgrammeResponse;
import org.nexus.admissions.service.NapBackendClient.NapApplication;
import org.nexus.admissions.service.NapBackendClient.NapProgram;
import org.springframework.stereotype.Service;

@Service
public class StudentProgrammeService {

    private final NapBackendClient napClient;

    public StudentProgrammeService(NapBackendClient napClient) {
        this.napClient = napClient;
    }

    public StudentProgrammeResponse findByStudentIdentifier(String identifier) {
        NapApplication app = resolveApplication(identifier);
        String admitted = pickAdmittedProgramme(app);
        NapProgram program = matchProgram(admitted);
        return build(app, admitted, program);
    }

    private NapApplication resolveApplication(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new RuntimeException("A student PRN, application id, or email is required");
        }
        List<NapApplication> all = napClient.fetchAll();
        String trimmed = identifier.trim();
        try {
            Long id = Long.parseLong(trimmed);
            return all.stream()
                    .filter(a -> a.id() != null && a.id().equals(id))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("No admission found for application id " + id));
        } catch (NumberFormatException ignored) {
            // identifier is a PRN or email, resolved below
        }
        String norm = trimmed.toLowerCase(Locale.ROOT);
        return all.stream()
                .filter(a -> (a.prn() != null && a.prn().equalsIgnoreCase(trimmed))
                        || (a.email() != null && a.email().toLowerCase(Locale.ROOT).equals(norm)))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No admission found for identifier " + trimmed));
    }

    private String pickAdmittedProgramme(NapApplication app) {
        if (app.assignedProgramme() != null && !app.assignedProgramme().isBlank()) {
            return app.assignedProgramme().trim();
        }
        if (app.programChoice1() != null && !app.programChoice1().isBlank()) {
            return app.programChoice1().trim();
        }
        return null;
    }

    private NapProgram matchProgram(String admitted) {
        List<NapProgram> programs = napClient.fetchProgrammes();
        if (programs.isEmpty()) return null;
        List<NapProgram> actives = programs.stream()
                .filter(p -> "Active".equalsIgnoreCase(p.status()))
                .toList();
        if (admitted == null || admitted.isBlank()) {
            return actives.isEmpty() ? programs.get(0) : actives.get(0);
        }
        String norm = normalize(admitted);
        NapProgram exact = matchExact(actives, norm);
        if (exact != null) return exact;
        NapProgram containing = matchContaining(actives, norm);
        if (containing != null) return containing;
        NapProgram anyExact = matchExact(programs, norm);
        if (anyExact != null) return anyExact;
        return actives.isEmpty() ? programs.get(0) : actives.get(0);
    }

    private NapProgram matchExact(List<NapProgram> programs, String norm) {
        return programs.stream()
                .filter(p -> norm.equals(normalize(p.programName())) || norm.equals(normalize(p.programCode())))
                .findFirst()
                .orElse(null);
    }

    private NapProgram matchContaining(List<NapProgram> programs, String norm) {
        return programs.stream()
                .filter(p -> {
                    String name = normalize(p.programName());
                    String code = normalize(p.programCode());
                    return (name != null && (name.contains(norm) || norm.contains(name)))
                            || (code != null && code.contains(norm));
                })
                .findFirst()
                .orElse(null);
    }

    private String normalize(String value) {
        return value == null ? null : value.toLowerCase(Locale.ROOT).trim();
    }

    private StudentProgrammeResponse build(NapApplication app, String admitted, NapProgram program) {
        StudentProgrammeResponse.Admission admission = new StudentProgrammeResponse.Admission(
                app.id(),
                app.prn(),
                app.registrationNumber(),
                app.studentNumber(),
                fullName(app),
                app.email(),
                app.programChoice1(),
                app.programChoice2(),
                app.programChoice3(),
                app.programChoice4(),
                app.assignedProgramme(),
                app.studyMode(),
                app.academicYear(),
                app.semester(),
                app.startDate(),
                app.status(),
                app.reviewStatus(),
                money(app.feeRequired()),
                money(app.feePaid()),
                app.feeCurrency());

        return new StudentProgrammeResponse(
                admission,
                admitted,
                program != null ? program.id() : null,
                firstNonBlank(program != null ? program.programName() : null, admitted),
                program != null ? program.programCode() : null,
                program != null ? program.programType() : null,
                program != null ? program.awardQualification() : null,
                program != null ? program.programDescription() : null,
                program != null ? program.programObjectives() : null,
                program != null ? program.learningOutcomes() : null,
                program != null ? program.careerOpportunities() : null,
                firstNonBlank(program != null ? program.status() : null, app.status()),
                program != null ? program.facultySchool() : null,
                program != null ? program.department() : null,
                program != null ? program.programCoordinator() : null,
                program != null ? program.campus() : null,
                first(program != null ? program.duration() : null),
                program != null ? program.durationUnit() : null,
                first(program != null ? program.numberOfYears() : null),
                first(program != null ? program.numberOfSemesters() : null),
                first(program != null ? program.semestersPerYear() : null),
                first(program != null ? program.totalCreditUnits() : null),
                firstNonBlank(program != null ? program.studyMode() : null, app.studyMode()),
                program != null ? program.academicCalendar() : null,
                program != null ? program.fees() : null,
                program != null ? program.admissionRequirements() : null,
                program != null ? program.curriculum() : null,
                program != null ? program.intakes() : null,
                program != null ? program.studyOptions() : null,
                program != null ? program.accreditation() : null,
                program != null ? program.shortDescription() : null,
                program != null ? program.cutoffScore() : null,
                program != null ? program.essentialSubjects() : null,
                program != null ? program.relevantSubjects() : null,
                program != null ? program.desirableSubjects() : null,
                first(program != null ? program.minimumUcePasses() : null),
                first(program != null ? program.capacity() : null),
                firstNonBlank(program != null ? program.intakeYear() : null, app != null ? app.academicYear() : null));
    }

    private String fullName(NapApplication app) {
        StringBuilder sb = new StringBuilder();
        if (app.firstName() != null) sb.append(app.firstName());
        if (app.lastName() != null) {
            if (!sb.isEmpty()) sb.append(" ");
            sb.append(app.lastName());
        }
        return sb.toString();
    }

    private String money(BigDecimal amount) {
        return amount == null ? null : amount.toPlainString();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value;
        }
        return null;
    }

    private Integer first(Integer value) {
        return value;
    }
}