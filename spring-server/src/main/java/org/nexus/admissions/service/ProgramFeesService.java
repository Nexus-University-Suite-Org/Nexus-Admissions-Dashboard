package org.nexus.admissions.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.nexus.admissions.dto.ProgramFeesResponse;
import org.nexus.admissions.dto.ProgramFeesResponse.FeeSemester;
import org.nexus.admissions.dto.ProgramFeesResponse.FeeYear;
import org.nexus.admissions.model.Program;
import org.nexus.admissions.repository.ProgramRepository;
import org.springframework.stereotype.Service;

@Service
public class ProgramFeesService {

    private final ProgramRepository programRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ProgramFeesService(ProgramRepository programRepository) {
        this.programRepository = programRepository;
    }

    public List<ProgramFeesResponse> getProgramSemesterFees(String programCode) {
        List<Program> programs = programRepository.findByDeletedAtIsNull().stream()
                .filter(p -> programCode == null || programCode.isBlank()
                        || programCode.trim().equalsIgnoreCase(p.getProgramCode()))
                .toList();

        List<ProgramFeesResponse> results = new ArrayList<>();
        for (Program program : programs) {
            if (program.getFees() == null || program.getFees().isBlank()) continue;
            ProgramFeesResponse fees = parseFees(program);
            if (fees != null) results.add(fees);
        }
        return results;
    }

    private ProgramFeesResponse parseFees(Program program) {
        try {
            JsonNode root = objectMapper.readTree(program.getFees());
            if (root == null || !root.isObject()) return null;

            String currency = text(root.get("currency"));
            JsonNode yearFees = root.get("year_fees");
            if (yearFees == null || !yearFees.isArray()) return null;

            List<FeeYear> years = new ArrayList<>();
            for (JsonNode yearNode : yearFees) {
                if (!yearNode.isObject()) continue;
                Integer year = yearNode.path("year").isNumber()
                        ? yearNode.path("year").asInt()
                        : null;
                JsonNode semestersNode = yearNode.get("semesters");
                if (semestersNode == null || !semestersNode.isArray()) continue;

                List<FeeSemester> semesters = new ArrayList<>();
                for (JsonNode semesterNode : semestersNode) {
                    if (!semesterNode.isObject()) continue;
                    semesters.add(new FeeSemester(
                            text(semesterNode.get("name")),
                            text(semesterNode.get("termType")),
                            decimal(semesterNode.get("tuition")),
                            decimal(semesterNode.get("registration")),
                            decimal(semesterNode.get("examination")),
                            decimal(semesterNode.get("functional")),
                            decimal(semesterNode.get("ict")),
                            decimal(semesterNode.get("library")),
                            decimal(semesterNode.get("medical")),
                            decimal(semesterNode.get("accommodation")),
                            decimal(semesterNode.get("other")),
                            semesterTotal(semesterNode)));
                }
                if (!semesters.isEmpty()) {
                    years.add(new FeeYear(year, semesters));
                }
            }

            return new ProgramFeesResponse(
                    program.getProgramCode(),
                    program.getProgramName(),
                    program.getFacultySchool(),
                    program.getCampus(),
                    currency != null ? currency : "UGX",
                    years);
        } catch (Exception e) {
            return null;
        }
    }

    private BigDecimal semesterTotal(JsonNode semesterNode) {
        BigDecimal declared = decimal(semesterNode.get("total"));
        if (declared != null) return declared;
        BigDecimal sum = BigDecimal.ZERO;
        String[] keys = {"tuition", "registration", "examination", "functional",
                "ict", "library", "medical", "accommodation", "other"};
        for (String key : keys) {
            BigDecimal value = decimal(semesterNode.get(key));
            if (value != null) sum = sum.add(value);
        }
        return sum;
    }

    private String text(JsonNode node) {
        if (node == null || node.isNull() || !node.isValueNode()) return null;
        String value = node.asText();
        return value.isBlank() ? null : value;
    }

    private BigDecimal decimal(JsonNode node) {
        if (node == null || node.isNull() || !node.isNumber()) return null;
        return node.decimalValue();
    }
}