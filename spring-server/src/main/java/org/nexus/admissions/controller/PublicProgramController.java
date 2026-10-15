package org.nexus.admissions.controller;

import java.util.List;
import org.nexus.admissions.model.Program;
import org.nexus.admissions.service.ProgramCatalogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public, read-only programme catalogue.
 *
 * <p>The applicant portal (NAP) fetches these programmes to populate the course
 * selection step. The programmes are the same records the dashboard publishes,
 * so there is a single source of truth in the NAD database.
 */
@RestController
@RequestMapping("/api/v1/public/programs")
public class PublicProgramController {

    private final ProgramCatalogService programCatalogService;

    public PublicProgramController(ProgramCatalogService programCatalogService) {
        this.programCatalogService = programCatalogService;
    }

    @GetMapping
    public ResponseEntity<List<Program>> list() {
        return ResponseEntity.ok(programCatalogService.listActive());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Program> getById(@PathVariable Long id) {
        return programCatalogService.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
