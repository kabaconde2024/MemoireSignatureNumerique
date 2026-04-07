package pfe.back_end.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReponseCertificat {
    private String subjectName;
    private String email;
    private String notBefore;
    private String notAfter;
    private String serialNumber;
    private String algorithme;
}