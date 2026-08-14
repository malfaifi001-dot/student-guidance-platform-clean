package com.teachix.timetable.v1;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;

import com.teachix.timetable.v1.api.TimetableSolveRequestV1;
import com.teachix.timetable.v1.domain.TimetableSolutionV1;
import com.teachix.timetable.v1.mapping.TimetableRequestMapperV1;

import org.junit.jupiter.api.Test;

class TimetableRequestMapperV1Tests {

    @Test
    void expandsAssignmentIntoBlocks() {
        TimetableSolveRequestV1 request =
            new TimetableSolveRequestV1(
                "1",
                "project-1",

                List.of(
                    new TimetableSolveRequestV1.DayInput(
                        "SUN",
                        "Sunday",
                        1
                    )
                ),

                List.of(
                    new TimetableSolveRequestV1.PeriodInput(
                        "P1",
                        "P1",
                        1
                    ),
                    new TimetableSolveRequestV1.PeriodInput(
                        "P2",
                        "P2",
                        2
                    ),
                    new TimetableSolveRequestV1.PeriodInput(
                        "P3",
                        "P3",
                        3
                    )
                ),

                List.of(),
                List.of(),
                List.of(),

                List.of(
                    new TimetableSolveRequestV1.AssignmentInput(
                        "A1",
                        "T1",
                        "C1",
                        "S1",
                        3,
                        1,
                        1,
                        List.of()
                    )
                ),

                List.of(),
                null
            );

        TimetableSolutionV1 solution =
            new TimetableRequestMapperV1()
                .map(
                    request
                );

        assertEquals(
            2,
            solution
                .getBlocks()
                .size()
        );

        assertEquals(
            3,
            solution
                .getBlocks()
                .stream()
                .mapToInt(
                    block ->
                        block.getLength()
                )
                .sum()
        );
    }
}