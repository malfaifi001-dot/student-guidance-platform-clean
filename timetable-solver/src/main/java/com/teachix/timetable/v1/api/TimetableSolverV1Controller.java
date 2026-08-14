package com.teachix.timetable.v1.api;

import java.util.concurrent.ExecutionException;

import com.teachix.timetable.v1.solver.TimetableSolverServiceV1;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class TimetableSolverV1Controller {

    private final TimetableSolverServiceV1
        solverService;

    public TimetableSolverV1Controller(
        TimetableSolverServiceV1 solverService
    ) {
        this.solverService =
            solverService;
    }

    @GetMapping("/health")
    public HealthResponse health() {
        return new HealthResponse(
            "ok",
            "teachix-timetable-solver",
            "1"
        );
    }

    @PostMapping("/solve")
    public TimetableSolveResultV1 solve(
        @RequestBody
        TimetableSolveRequestV1 request
    ) throws ExecutionException, InterruptedException {
        return solverService.solve(
            request
        );
    }

    @ExceptionHandler(
        IllegalArgumentException.class
    )
    public ResponseEntity<ErrorResponse>
        invalidRequest(
            IllegalArgumentException error
        ) {
        return ResponseEntity
            .status(
                HttpStatus.BAD_REQUEST
            )
            .body(
                new ErrorResponse(
                    false,
                    error.getMessage()
                )
            );
    }

    public record HealthResponse(
        String status,
        String service,
        String contractVersion
    ) {
    }

    public record ErrorResponse(
        boolean success,
        String error
    ) {
    }
}