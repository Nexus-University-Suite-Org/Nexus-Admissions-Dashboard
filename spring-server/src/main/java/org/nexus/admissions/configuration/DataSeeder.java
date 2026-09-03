package org.nexus.admissions.configuration;

import java.time.LocalDateTime;
import org.nexus.admissions.model.Admin;
import org.nexus.admissions.repository.AdminRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(AdminRepository adminRepository, PasswordEncoder passwordEncoder) {
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (!adminRepository.existsByEmail("admin@nexus.edu")) {
            Admin admin = new Admin();
            admin.setEmail("admin@nexus.edu");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setFullName("System Administrator");
            admin.setCreatedAt(LocalDateTime.now());
            adminRepository.save(admin);
            log.info("Created admin user: admin@nexus.edu");
        }
    }
}
