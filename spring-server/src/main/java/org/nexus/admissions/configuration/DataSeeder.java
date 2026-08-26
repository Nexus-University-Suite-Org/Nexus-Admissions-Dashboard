package org.nexus.admissions.configuration;

import java.time.LocalDateTime;
import org.nexus.admissions.model.Admin;
import org.nexus.admissions.repository.AdminRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

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
            admin.setFullName("Dr. Miriam Nambassa");
            admin.setCreatedAt(LocalDateTime.now());
            adminRepository.save(admin);
            System.out.println("Default admin created: admin@nexus.edu / admin123");
        }
    }
}
