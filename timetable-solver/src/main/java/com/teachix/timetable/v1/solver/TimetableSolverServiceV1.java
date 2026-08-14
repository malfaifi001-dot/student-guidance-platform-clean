package com.teachix.timetable.v1.solver;

import java.util.UUID;
import java.util.concurrent.ExecutionException;

import com.teachix.timetable.v1.api.TimetableSolveRequestV1;
import com.teachix.timetable.v1.api.TimetableSolveResultV1;
import com.teachix.timetable.v1.domain.TimetableSolutionV1;
import com.teachix.timetable.v1.mapping.TimetableRequestMapperV1;
import com.teachix.timetable.v1.mapping.TimetableResultMapperV1;

import ai.timefold.solver.core.api.solver.SolverJob;
import ai.timefold.solver.core.api.solver.SolverManager;

import org.springframework.stereotype.Service;

@Service
public class TimetableSolverServiceV1 {

    private final SolverManager<TimetableSolutionV1>
        solverManager;

    private final TimetableRequestMapperV1
        requestMapper;

    private final TimetableResultMapperV1
        resultMapper;

    public TimetableSolverServiceV1(
        SolverManager<TimetableSolutionV1> solverManager,
        TimetableRequestMapperV1 requestMapper,
        TimetableResultMapperV1 resultMapper
    ) {
        this.solverManager =
            solverManager;

        this.requestMapper =
            requestMapper;

        this.resultMapper =
            resultMapper;
    }

    public TimetableSolveResultV1 solve(
        TimetableSolveRequestV1 request
    ) throws ExecutionException, InterruptedException {

        TimetableSolutionV1 problem =
            requestMapper.map(
                request
            );

        UUID problemId =
            UUID.randomUUID();

        long startedAt =
            System.currentTimeMillis();

        SolverJob<TimetableSolutionV1> job =
            solverManager.solve(
                problemId,
                problem
            );

        TimetableSolutionV1 solution =
            job.getFinalBestSolution();

        long durationMs =
            System.currentTimeMillis()
                - startedAt;

        return resultMapper.map(
            request.projectId(),
            solution,
            durationMs
        );
    }
}