package com.teachix.timetable.v1.constraints;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.teachix.timetable.v1.domain.LessonBlockV1;
import com.teachix.timetable.v1.domain.PlanningSlotV1;

import ai.timefold.solver.core.api.score.HardSoftScore;
import ai.timefold.solver.core.api.score.stream.Constraint;
import ai.timefold.solver.core.api.score.stream.ConstraintCollectors;
import ai.timefold.solver.core.api.score.stream.ConstraintFactory;
import ai.timefold.solver.core.api.score.stream.ConstraintProvider;
import ai.timefold.solver.core.api.score.stream.Joiners;

public class TimetableConstraintProviderV1
    implements ConstraintProvider {

    private record TeacherDayKey(
        String teacherId,
        String dayId,
        int limit
    ) {
    }

    private record SubjectClassDayKey(
        String subjectId,
        String classId,
        String dayId,
        int limit
    ) {
    }

    @Override
    public Constraint[] defineConstraints(
        ConstraintFactory factory
    ) {
        return new Constraint[] {
            teacherOverlap(
                factory
            ),

            classOverlap(
                factory
            ),

            blockedSlotSafety(
                factory
            ),

            teacherMaxDaily(
                factory
            ),

            teacherMaxConsecutive(
                factory
            ),

            subjectMaxDaily(
                factory
            ),

            preferredSlot(
                factory
            )
        };
    }

    private Constraint teacherOverlap(
        ConstraintFactory factory
    ) {
        return factory
            .forEachUniquePair(
                LessonBlockV1.class,

                Joiners.equal(
                    LessonBlockV1::getTeacherId
                )
            )
            .filter(
                LessonBlockV1::overlaps
            )
            .penalize(
                HardSoftScore.ONE_HARD
            )
            .asConstraint(
                "V1 teacher overlap"
            );
    }

    private Constraint classOverlap(
        ConstraintFactory factory
    ) {
        return factory
            .forEachUniquePair(
                LessonBlockV1.class,

                Joiners.equal(
                    LessonBlockV1::getClassId
                )
            )
            .filter(
                LessonBlockV1::overlaps
            )
            .penalize(
                HardSoftScore.ONE_HARD
            )
            .asConstraint(
                "V1 class overlap"
            );
    }

    private Constraint blockedSlotSafety(
        ConstraintFactory factory
    ) {
        return factory
            .forEach(
                LessonBlockV1.class
            )
            .filter(
                LessonBlockV1::usesBlockedSlot
            )
            .penalize(
                HardSoftScore.ONE_HARD
            )
            .asConstraint(
                "V1 blocked slot safety"
            );
    }

    private Constraint teacherMaxDaily(
        ConstraintFactory factory
    ) {
        return factory
            .forEach(
                LessonBlockV1.class
            )
            .filter(
                block ->
                    block.getStartSlot() != null &&
                    block.getTeacherMaxDaily() != null
            )
            .groupBy(
                block ->
                    new TeacherDayKey(
                        block.getTeacherId(),
                        block.getDayId(),
                        block.getTeacherMaxDaily()
                    ),

                ConstraintCollectors.toList()
            )
            .filter(
                (
                    key,
                    blocks
                ) ->
                    occupiedCount(
                        blocks
                    ) >
                    key.limit()
            )
            .penalize(
                HardSoftScore.ONE_HARD,

                (
                    key,
                    blocks
                ) ->
                    occupiedCount(
                        blocks
                    ) -
                    key.limit()
            )
            .asConstraint(
                "V1 teacher max daily"
            );
    }

    private Constraint teacherMaxConsecutive(
        ConstraintFactory factory
    ) {
        return factory
            .forEach(
                LessonBlockV1.class
            )
            .filter(
                block ->
                    block.getStartSlot() != null &&
                    block.getTeacherMaxConsecutive() != null
            )
            .groupBy(
                block ->
                    new TeacherDayKey(
                        block.getTeacherId(),
                        block.getDayId(),
                        block.getTeacherMaxConsecutive()
                    ),

                ConstraintCollectors.toList()
            )
            .filter(
                (
                    key,
                    blocks
                ) ->
                    longestConsecutive(
                        blocks
                    ) >
                    key.limit()
            )
            .penalize(
                HardSoftScore.ONE_HARD,

                (
                    key,
                    blocks
                ) ->
                    longestConsecutive(
                        blocks
                    ) -
                    key.limit()
            )
            .asConstraint(
                "V1 teacher max consecutive"
            );
    }

    private Constraint subjectMaxDaily(
        ConstraintFactory factory
    ) {
        return factory
            .forEach(
                LessonBlockV1.class
            )
            .filter(
                block ->
                    block.getStartSlot() != null &&
                    block.getSubjectMaxDaily() != null
            )
            .groupBy(
                block ->
                    new SubjectClassDayKey(
                        block.getSubjectId(),
                        block.getClassId(),
                        block.getDayId(),
                        block.getSubjectMaxDaily()
                    ),

                ConstraintCollectors.toList()
            )
            .filter(
                (
                    key,
                    blocks
                ) ->
                    occupiedCount(
                        blocks
                    ) >
                    key.limit()
            )
            .penalize(
                HardSoftScore.ONE_HARD,

                (
                    key,
                    blocks
                ) ->
                    occupiedCount(
                        blocks
                    ) -
                    key.limit()
            )
            .asConstraint(
                "V1 subject max daily per class"
            );
    }

    private Constraint preferredSlot(
        ConstraintFactory factory
    ) {
        return factory
            .forEach(
                LessonBlockV1.class
            )
            .filter(
                block ->
                    block.getStartSlot() != null &&
                    block.preferencePenalty() >
                        0
            )
            .penalize(
                HardSoftScore.ONE_SOFT,
                LessonBlockV1::preferencePenalty
            )
            .asConstraint(
                "V1 preferred slot"
            );
    }

    private static int occupiedCount(
        List<LessonBlockV1> blocks
    ) {
        return blocks
            .stream()
            .mapToInt(
                LessonBlockV1::getLength
            )
            .sum();
    }

    private static int longestConsecutive(
        List<LessonBlockV1> blocks
    ) {
        Set<Integer> orders =
            new HashSet<>();

        for (
            LessonBlockV1 block :
            blocks
        ) {
            for (
                PlanningSlotV1 slot :
                block.occupiedSlots()
            ) {
                orders.add(
                    slot.periodOrder()
                );
            }
        }

        int[] sorted =
            orders
                .stream()
                .mapToInt(
                    Integer::intValue
                )
                .sorted()
                .toArray();

        if (
            sorted.length == 0
        ) {
            return 0;
        }

        int longest =
            1;

        int current =
            1;

        for (
            int i = 1;
            i < sorted.length;
            i++
        ) {
            if (
                sorted[i] ==
                    sorted[i - 1] + 1
            ) {
                current++;
            }
            else {
                current =
                    1;
            }

            longest =
                Math.max(
                    longest,
                    current
                );
        }

        return longest;
    }
}