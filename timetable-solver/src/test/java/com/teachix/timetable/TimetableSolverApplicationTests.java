package com.teachix.timetable;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Autowired;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import com.teachix.timetable.v1.api.TimetableSolveRequestV1;
import com.teachix.timetable.v1.api.TimetableSolveResultV1;
import com.teachix.timetable.v1.solver.TimetableSolverServiceV1;

@SpringBootTest
class TimetableSolverApplicationTests {

    @Autowired
    private TimetableSolverServiceV1 solverService;

    @Test
    void contextLoads() {
    }

    @Test
    void trivialPerfectProblemStopsBeforeMaximum() throws Exception {
        long startedAt = System.currentTimeMillis();

        TimetableSolveResultV1 result =
            solverService.solve(request(1));

        long durationMs =
            System.currentTimeMillis() - startedAt;

        assertTrue(result.success());
        assertEquals(0, result.hardScore());
        assertEquals(0, result.softScore());
        assertTrue(durationMs < 20_000);
    }

    @Test
    void hardConflictIsNotReportedAsAValidPerfectSchedule() throws Exception {
        TimetableSolveResultV1 result =
            solverService.solve(request(2));

        assertFalse(result.success());
        assertTrue(result.hardScore() < 0);
    }

    private TimetableSolveRequestV1 request(int assignedLessons) {
        return new TimetableSolveRequestV1(
            "1",
            "test-project",
            List.of(new TimetableSolveRequestV1.DayInput("SUN", "Sunday", 1)),
            List.of(new TimetableSolveRequestV1.PeriodInput("P1", "P1", 1)),
            List.of(new TimetableSolveRequestV1.TeacherInput("T1", "Teacher", null)),
            List.of(new TimetableSolveRequestV1.ClassInput("C1", "Class")),
            List.of(new TimetableSolveRequestV1.SubjectInput("S1", "Subject")),
            List.of(new TimetableSolveRequestV1.AssignmentInput(
                "A1", "T1", "C1", "S1", assignedLessons, assignedLessons, 0, List.of()
            )),
            List.of(),
            new TimetableSolveRequestV1.SolveOptions(1L, 60),
            "test-request"
        );
    }
}
