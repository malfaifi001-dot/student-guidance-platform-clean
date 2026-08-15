package com.teachix.timetable.v1;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.Map;

import com.teachix.timetable.v1.api.TimetableSolveRequestV1;
import com.teachix.timetable.v1.domain.LessonBlockV1;
import com.teachix.timetable.v1.domain.TimetableSolutionV1;
import com.teachix.timetable.v1.mapping.TimetableRequestMapperV1;

import org.junit.jupiter.api.Test;

class TimetableRequestMapperV1Tests {

    @Test
    void appliesTeacherPreferredOnlyToTargetedTeacher() {
        TimetableSolutionV1 solution =
            new TimetableRequestMapperV1()
                .map(
                    preferenceRequest(
                        "TEACHER_PREFERRED",
                        List.of("T1"),
                        List.of()
                    )
                );

        LessonBlockV1 targeted =
            blockForTeacher(
                solution,
                "T1"
            );

        LessonBlockV1 other =
            blockForTeacher(
                solution,
                "T2"
            );

        targeted.setStartSlot(
            solution.getSlots().get(1)
        );

        other.setStartSlot(
            solution.getSlots().get(1)
        );

        assertEquals(
            7,
            targeted.preferencePenalty()
        );

        assertEquals(
            0,
            other.preferencePenalty()
        );
    }

    @Test
    void preservesSubjectPreferredBehavior() {
        TimetableSolutionV1 solution =
            new TimetableRequestMapperV1()
                .map(
                    preferenceRequest(
                        "SUBJECT_PREFERRED",
                        List.of(),
                        List.of("S1")
                    )
                );

        for (
            LessonBlockV1 block :
            solution.getBlocks()
        ) {
            block.setStartSlot(
                solution.getSlots().get(1)
            );

            assertEquals(
                7,
                block.preferencePenalty()
            );
        }
    }

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

    private TimetableSolveRequestV1 preferenceRequest(
        String type,
        List<String> teacherIds,
        List<String> subjectIds
    ) {
        return new TimetableSolveRequestV1(
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
                    1,
                    1,
                    0,
                    List.of()
                ),
                new TimetableSolveRequestV1.AssignmentInput(
                    "A2",
                    "T2",
                    "C2",
                    "S1",
                    1,
                    1,
                    0,
                    List.of()
                )
            ),
            List.of(
                new TimetableSolveRequestV1.ConstraintInput(
                    "PREFERENCE-1",
                    type,
                    "SOFT",
                    null,
                    7,
                    teacherIds,
                    subjectIds,
                    List.of(),
                    List.of(),
                    List.of(),
                    List.of(
                        new TimetableSolveRequestV1.SlotInput(
                            "SUN",
                            "P1"
                        )
                    ),
                    Map.of()
                )
            ),
            null
        );
    }

    private LessonBlockV1 blockForTeacher(
        TimetableSolutionV1 solution,
        String teacherId
    ) {
        return solution
            .getBlocks()
            .stream()
            .filter(
                block ->
                    teacherId.equals(
                        block.getTeacherId()
                    )
            )
            .findFirst()
            .orElseThrow();
    }
}
