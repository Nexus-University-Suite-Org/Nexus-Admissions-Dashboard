package org.nexus.admissions.service;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.nexus.admissions.model.Program;
import org.nexus.admissions.repository.ProgramRepository;
import org.springframework.stereotype.Service;

/**
 * Read-only view of the programme catalogue owned by the admissions dashboard.
 *
 * <p>Programmes live in the NAD database and are consumed by the applicant
 * portal (NAP) for its course selection, so they are exposed here rather than
 * duplicated into the NAP database.
 */
@Service
public class ProgramCatalogService {

    private final ProgramRepository programRepository;

    public ProgramCatalogService(ProgramRepository programRepository) {
        this.programRepository = programRepository;
    }

    public List<Program> listActive() {
        return programRepository.findByDeletedAtIsNull().stream()
                .filter(program -> program.getStatus() == null
                        || "Active".equalsIgnoreCase(program.getStatus()))
                .sorted(Comparator
                        .comparing((Program program) -> program.getDisplayOrder() == null
                                ? Integer.MAX_VALUE
                                : program.getDisplayOrder())
                        .thenComparing(program -> program.getProgramName() == null
                                ? ""
                                : program.getProgramName()))
                .toList();
    }

    public Optional<Program> findById(Long id) {
        return programRepository.findById(id)
                .filter(program -> program.getDeletedAt() == null);
    }
}
