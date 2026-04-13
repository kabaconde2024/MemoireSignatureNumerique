package pfe.back_end;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class BackEndApplication {

    /**
     * Cette méthode s'exécute après le démarrage de l'application.
     * Elle force le fuseau horaire par défaut sur "Africa/Tunis" (UTC+1)
     * pour que les dates générées correspondent à l'heure locale.
     */
    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone("Africa/Tunis"));
    }

    public static void main(String[] args) {
        SpringApplication.run(BackEndApplication.class, args);
    }

}