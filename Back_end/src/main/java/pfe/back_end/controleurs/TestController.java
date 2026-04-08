package pfe.back_end.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/public")
public class TestController {
    
    @GetMapping("/ping")
    public ResponseEntity<Map<String, String>> ping() {
        return ResponseEntity.ok(Map.of(
            "status", "OK",
            "message", "Backend is running",
            "timestamp", Instant.now().toString()
        ));
    }
}