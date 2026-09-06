package org.nexus.admissions.controller;

import org.nexus.admissions.dto.StudentProgrammeResponse;
import org.nexus.admissions.service.StudentProgrammeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/students")
public class StudentProgrammeController {

    private final StudentProgrammeService studentProgrammeService;

    public StudentProgrammeController(StudentProgrammeService studentProgrammeService) {
        this.studentProgrammeService = studentProgrammeService;
    }

    @GetMapping("/{identifier}/programme")
    public ResponseEntity<StudentProgrammeResponse> programme(@PathVariable String identifier) {
        return ResponseEntity.ok(studentProgrammeService.findByStudentIdentifier(identifier));
    }
}