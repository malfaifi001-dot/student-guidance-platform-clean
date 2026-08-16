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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class TimetableSolverServiceV1 {

    private static final Logger log =
        LoggerFactory.getLogger(
            TimetableSolverServiceV1.class
        );

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

        String requestId =
            request.requestId() != null &&
            !request.requestId().isBlank()
                ? request.requestId()
                : problemId.toString().substring(0, 8);

        log.info(
            "[TIMETABLE] {} SOLVER REQUEST project={} days={} periods={} teachers={} classes={} assignments={}",
            requestId,
            request.projectId(),
            request.days().size(),
            request.periods().size(),
            request.teachers().size(),
            request.classes().size(),
            request.assignments().size()
        );

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

        log.info(
            "[TIMETABLE] {} SOLVER OK durationMs={} score={} sessions={}",
            requestId,
            durationMs,
            solution.getScore(),
            solution.getBlocks().size()
        );

        return resultMapper.map(
            request.projectId(),
            solution,
            durationMs
        );
    }
}
