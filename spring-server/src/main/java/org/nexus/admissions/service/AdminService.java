package org.nexus.admissions.service;

import java.time.LocalDateTime;
import java.util.Optional;
import org.nexus.admissions.model.Admin;
import org.nexus.admissions.repository.AdminRepository;
import org.springframework.stereotype.Service;

@Service
public class AdminService {

    private final AdminRepository repository;

    public AdminService(AdminRepository repository) {
        this.repository = repository;
    }

    public Optional<Admin> findById(Long id) {
        return repository.findById(id);
    }

    public Optional<Admin> findByEmail(String email) {
        return repository.findByEmail(email);
    }

    public Admin create(Admin admin) {
        admin.setCreatedAt(LocalDateTime.now());
        return repository.save(admin);
    }

    public Admin update(Admin admin) {
        return repository.save(admin);
    }

    public boolean existsByEmail(String email) {
        return repository.existsByEmail(email);
    }
}
