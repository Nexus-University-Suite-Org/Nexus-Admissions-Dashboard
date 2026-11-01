package org.nexus.admissions.controller;

import java.util.List;
import org.nexus.admissions.configuration.JwtAuthFilter;
import org.nexus.admissions.model.Program;
import org.nexus.admissions.service.ProgramAdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Write-side admin API for the programme catalogue owned by the admissions
 * dashboard. The dashboard admin UI manages the same records the applicant
 * portal (NAP) reads through the public catalogue.
 */
@RestController
@RequestMapping("/api/v1/admin/programs")
public class AdminProgramController {

    private final ProgramAdminService programAdminService;

    public AdminProgramController(ProgramAdminService programAdminService) {
        this.programAdminService = programAdminService;
    }

    @GetMapping
    public ResponseEntity<List<Program>> list() {
        return ResponseEntity.ok(programAdminService.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Program> get(@PathVariable Long id) {
        return ResponseEntity.ok(programAdminService.get(id));
    }

    @PostMapping
    public ResponseEntity<Program> create(@RequestBody Program program, Authentication authentication) {
        return ResponseEntity.ok(programAdminService.create(program, actor(authentication)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Program> update(
            @PathVariable Long id,
            @RequestBody Program program,
            Authentication authentication) {
        return ResponseEntity.ok(programAdminService.update(id, program, actor(authentication)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        programAdminService.softDelete(id, actor(authentication));
        return ResponseEntity.noContent().build();
    }

    /**
     * Programme-to-category links are accepted so the dashboard's edit form can
     * sync its category selection, but the admissions catalogue has no category
     * model, so the links are not persisted.
     */
    @PostMapping("/{id}/categories/{categoryId}")
    public ResponseEntity<Void> attachCategory(@PathVariable Long id, @PathVariable Long categoryId) {
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/categories/{categoryId}")
    public ResponseEntity<Void> detachCategory(@PathVariable Long id, @PathVariable Long categoryId) {
        return ResponseEntity.noContent().build();
    }

    private String actor(Authentication authentication) {
        if (authentication != null
                && authentication.getPrincipal() instanceof JwtAuthFilter.AdminPrincipal principal) {
            return principal.email();
        }
        return "system";
    }
}
