package org.nexus.admissions;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class AdmissionsApplication {

    public static void main(String[] args) {
        SpringApplication.run(AdmissionsApplication.class, args);
    }
}
