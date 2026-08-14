package com.teachix.timetable.v1.mapping;

import java.util.ArrayList;
import java.util.List;

import com.teachix.timetable.v1.api.TimetableSolveResultV1;
import com.teachix.timetable.v1.domain.LessonBlockV1;
import com.teachix.timetable.v1.domain.PlanningSlotV1;
import com.teachix.timetable.v1.domain.TimetableSolutionV1;

import org.springframework.stereotype.Component;

@Component
public class TimetableResultMapperV1 {

    public TimetableSolveResultV1 map(
        String projectId,
        TimetableSolutionV1 solution,
        long durationMs
    ) {
        List<
            TimetableSolveResultV1.BlockResult
        > blocks =
            new ArrayList<>();

        int solvedSessions =
            0;

        int requiredSessions =
            solution
                .getBlocks()
                .stream()
                .mapToInt(
                    LessonBlockV1::getLength
                )
                .sum();

        for (
            LessonBlockV1 block :
            solution.getBlocks()
        ) {
            List<PlanningSlotV1> occupied =
                block.occupiedSlots();

            if (
                occupied.size() ==
                    block.getLength()
            ) {
                solvedSessions +=
                    block.getLength();
            }

            List<
                TimetableSolveResultV1.OccupiedSlot
            > occupiedOutput =
                occupied
                    .stream()
                    .map(
                        slot ->
                            new TimetableSolveResultV1.OccupiedSlot(
                                slot.dayId(),
                                slot.periodId(),
                                slot.periodOrder()
                            )
                    )
                    .toList();

            blocks.add(
                new TimetableSolveResultV1.BlockResult(
                    block.getBlockId(),
                    block.getAssignmentId(),
                    block.getTeacherId(),
                    block.getClassId(),
                    block.getSubjectId(),
                    block.getLength(),

                    block.getStartSlot() != null
                        ? block
                            .getStartSlot()
                            .dayId()
                        : null,

                    block.getStartSlot() != null
                        ? block
                            .getStartSlot()
                            .periodId()
                        : null,

                    occupiedOutput
                )
            );
        }

        long hardScore =
            solution.getScore() != null
                ? solution
                    .getScore()
                    .hardScore()
                : Long.MIN_VALUE;

        long softScore =
            solution.getScore() != null
                ? solution
                    .getScore()
                    .softScore()
                : Long.MIN_VALUE;

        boolean success =
            solvedSessions ==
                requiredSessions &&
            hardScore >= 0;

        List<TimetableSolveResultV1.Diagnostic>
            diagnostics =
                new ArrayList<>();

        if (
            solvedSessions !=
                requiredSessions
        ) {
            diagnostics.add(
                new TimetableSolveResultV1.Diagnostic(
                    "NOT_FULLY_INITIALIZED",
                    "لم يتم توزيع جميع الحصص.",
                    null
                )
            );
        }

        if (
            hardScore < 0
        ) {
            diagnostics.add(
                new TimetableSolveResultV1.Diagnostic(
                    "HARD_CONSTRAINTS_NOT_FEASIBLE",
                    "الحل الحالي يحتوي مخالفات HARD.",
                    null
                )
            );
        }

        return new TimetableSolveResultV1(
            "1",
            "timefold-v1",
            success,
            projectId,

            solution.getScore() != null
                ? solution
                    .getScore()
                    .toString()
                : null,

            hardScore,
            softScore,
            requiredSessions,
            solvedSessions,
            solution
                .getBlocks()
                .size(),
            durationMs,
            blocks,
            diagnostics
        );
    }
}