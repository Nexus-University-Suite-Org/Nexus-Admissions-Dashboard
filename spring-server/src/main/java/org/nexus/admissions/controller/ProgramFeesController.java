package org.nexus.admissions.controller;

import java.util.List;
import org.nexus.admissions.dto.ProgramFeesResponse;
import org.nexus.admissions.service.ProgramFeesService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/fees")
public class ProgramFeesController {

    private final ProgramFeesService programFeesService;

    public ProgramFeesController(ProgramFeesService programFeesService) {
        this.programFeesService = programFeesService;
    }

    @GetMapping("/program-semesters")
    public ResponseEntity<List<ProgramFeesResponse>> programSemesterFees(
            @RequestParam(required = false) String programCode) {
        return ResponseEntity.ok(programFeesService.getProgramSemesterFees(programCode));
    }
}