package org.nexus.admissions.service;

import java.time.LocalDateTime;
import java.util.Optional;
import org.nexus.admissions.model.Application;
import org.nexus.admissions.repository.ApplicationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class ApplicationService {

    private final ApplicationRepository repository;

    public ApplicationService(ApplicationRepository repository) {
        this.repository = repository;
    }

    public Optional<Application> findById(Long id) {
        return repository.findById(id);
    }

    public Application save(Application application) {
        application.setUpdatedAt(LocalDateTime.now());
        return repository.save(application);
    }

    public long countByStatus(String status) {
        return repository.countByStatus(status);
    }

    public long countAll() {
        return repository.count();
    }

    public Page<Application> findFiltered(String status, String search, int page, int size) {
        return repository.findFiltered(
                status != null ? status : "ALL",
                search,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
    }

    public java.util.List<Application> findRecent(int limit) {
        return repository.findTopBySubmittedAtIsNotNullOrderBySubmittedAtDesc(
                PageRequest.of(0, limit)
        );
    }
}
