package org.nexus.admissions.service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import org.nexus.admissions.exception.NotFoundException;
import org.nexus.admissions.model.Program;
import org.nexus.admissions.repository.ProgramRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Write-side of the programme catalogue owned by the admissions dashboard.
 *
 * <p>The dashboard's admin UI manages the same records the applicant portal
 * (NAP) reads through {@link ProgramCatalogService}, so edits made here are
 * immediately visible on the public catalogue.
 */
@Service
public class ProgramAdminService {

    private final ProgramRepository programRepository;

    public ProgramAdminService(ProgramRepository programRepository) {
        this.programRepository = programRepository;
    }

    public List<Program> listAll() {
        return programRepository.findByDeletedAtIsNull().stream()
                .sorted(Comparator
                        .comparing((Program program) -> program.getDisplayOrder() == null
                                ? Integer.MAX_VALUE
                                : program.getDisplayOrder())
                        .thenComparing(program -> program.getProgramName() == null
                                ? ""
                                : program.getProgramName()))
                .toList();
    }

    public Program get(Long id) {
        return programRepository.findById(id)
                .filter(program -> program.getDeletedAt() == null)
                .orElseThrow(() -> new NotFoundException("Programme " + id + " not found"));
    }

    @Transactional
    public Program create(Program program, String actor) {
        program.setId(null);
        program.setDeletedAt(null);
        LocalDateTime now = LocalDateTime.now();
        program.setCreatedAt(now);
        program.setUpdatedAt(now);
        program.setCreatedBy(actor);
        program.setUpdatedBy(actor);
        if (program.getStatus() == null) {
            program.setStatus("Active");
        }
        return programRepository.save(program);
    }

    @Transactional
    public Program update(Long id, Program program, String actor) {
        Program existing = get(id);
        program.setId(existing.getId());
        program.setCreatedAt(existing.getCreatedAt());
        program.setCreatedBy(existing.getCreatedBy());
        program.setDeletedAt(existing.getDeletedAt());
        program.setUpdatedAt(LocalDateTime.now());
        program.setUpdatedBy(actor);
        return programRepository.save(program);
    }

    @Transactional
    public void softDelete(Long id, String actor) {
        Program existing = get(id);
        existing.setDeletedAt(LocalDateTime.now());
        existing.setUpdatedBy(actor);
        programRepository.save(existing);
    }
}
