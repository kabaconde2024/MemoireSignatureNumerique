package pfe.back_end.modeles.entites;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor

public class RequeteOtp {
    private String email;
    private String code;
}