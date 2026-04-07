package pfe.back_end.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RequeteChangementMdp {
    // Utilise ces noms exacts pour correspondre à ton Controleur
    private String ancienMdp;
    private String nouveauMdp;
}