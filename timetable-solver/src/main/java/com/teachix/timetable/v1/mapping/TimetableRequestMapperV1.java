package com.teachix.timetable.v1.mapping;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.teachix.timetable.v1.api.TimetableSolveRequestV1;
import com.teachix.timetable.v1.constraints.ConstraintRegistryV1;
import com.teachix.timetable.v1.domain.LessonBlockV1;
import com.teachix.timetable.v1.domain.PlanningSlotV1;
import com.teachix.timetable.v1.domain.PreferredSlotRuleV1;
import com.teachix.timetable.v1.domain.TimetableSolutionV1;

import org.springframework.stereotype.Component;

@Component
public class TimetableRequestMapperV1 {

    public TimetableSolutionV1 map(
        TimetableSolveRequestV1 request
    ) {
        validateRequest(
            request
        );

        List<PlanningSlotV1> slots =
            createSlots(
                request
            );

        List<
            TimetableSolveRequestV1.ConstraintInput
        > constraints =
            request.constraints() != null
                ? request.constraints()
                : List.of();

        for (
            TimetableSolveRequestV1.ConstraintInput constraint :
            constraints
        ) {
            ConstraintRegistryV1
                .validate(
                    constraint
                );
        }

        List<LessonBlockV1> blocks =
            createBlocks(
                request.assignments()
            );

        for (
            LessonBlockV1 block :
            blocks
        ) {
            StructuralEligibilityV1
                .configure(
                    block,
                    slots,
                    constraints
                );

            configureScoringMetadata(
                block,
                slots,
                constraints
            );
        }

        return new TimetableSolutionV1(
            slots,
            blocks
        );
    }

    private List<PlanningSlotV1> createSlots(
        TimetableSolveRequestV1 request
    ) {
        List<PlanningSlotV1> slots =
            new ArrayList<>();

        for (
            TimetableSolveRequestV1.DayInput day :
            request.days()
        ) {
            for (
                TimetableSolveRequestV1.PeriodInput period :
                request.periods()
            ) {
                slots.add(
                    new PlanningSlotV1(
                        day.id(),
                        day.label(),
                        day.order(),
                        period.id(),
                        period.label(),
                        period.order()
                    )
                );
            }
        }

        return slots;
    }

    private List<LessonBlockV1> createBlocks(
        List<TimetableSolveRequestV1.AssignmentInput> assignments
    ) {
        List<LessonBlockV1> blocks =
            new ArrayList<>();

        for (
            TimetableSolveRequestV1.AssignmentInput assignment :
            assignments
        ) {
            int doubleBlocks =
                Math.max(
                    0,
                    assignment.doublePeriods()
                );

            int doubleSessions =
                doubleBlocks * 2;

            int singles =
                assignment.assignedLessons()
                    - doubleSessions;

            if (
                singles < 0
            ) {
                throw new IllegalArgumentException(
                    "INVALID_ASSIGNMENT_PERIOD_COUNTS:"
                        + assignment.id()
                );
            }

            int blockNumber =
                1;

            for (
                int i = 0;
                i < doubleBlocks;
                i++
            ) {
                blocks.add(
                    new LessonBlockV1(
                        assignment.id()
                            + ":block:"
                            + blockNumber++,
                        assignment.id(),
                        assignment.teacherId(),
                        assignment.classId(),
                        assignment.subjectId(),
                        2
                    )
                );
            }

            for (
                int i = 0;
                i < singles;
                i++
            ) {
                blocks.add(
                    new LessonBlockV1(
                        assignment.id()
                            + ":block:"
                            + blockNumber++,
                        assignment.id(),
                        assignment.teacherId(),
                        assignment.classId(),
                        assignment.subjectId(),
                        1
                    )
                );
            }
        }

        return blocks;
    }

    private void configureScoringMetadata(
        LessonBlockV1 block,
        List<PlanningSlotV1> slots,
        List<TimetableSolveRequestV1.ConstraintInput> constraints
    ) {
        Integer teacherMaxDaily =
            null;

        Integer teacherMaxConsecutive =
            null;

        Integer subjectMaxDaily =
            null;

        List<PreferredSlotRuleV1> preferred =
            new ArrayList<>();

        for (
            TimetableSolveRequestV1.ConstraintInput constraint :
            constraints
        ) {
            String type =
                ConstraintRegistryV1
                    .canonicalType(
                        constraint.type()
                    );

            String strength =
                constraint.strength() != null
                    ? constraint.strength()
                    : "HARD";

            if (
                "HARD".equals(
                    strength
                ) &&
                "TEACHER_MAX_DAILY".equals(
                    type
                ) &&
                contains(
                    constraint.teacherIds(),
                    block.getTeacherId()
                ) &&
                validLimit(
                    constraint.valueInt()
                )
            ) {
                teacherMaxDaily =
                    minimum(
                        teacherMaxDaily,
                        constraint.valueInt()
                    );

                continue;
            }

            if (
                "HARD".equals(
                    strength
                ) &&
                "TEACHER_MAX_CONSECUTIVE".equals(
                    type
                ) &&
                contains(
                    constraint.teacherIds(),
                    block.getTeacherId()
                ) &&
                validLimit(
                    constraint.valueInt()
                )
            ) {
                teacherMaxConsecutive =
                    minimum(
                        teacherMaxConsecutive,
                        constraint.valueInt()
                    );

                continue;
            }

            if (
                "HARD".equals(
                    strength
                ) &&
                "SUBJECT_MAX_DAILY".equals(
                    type
                ) &&
                contains(
                    constraint.subjectIds(),
                    block.getSubjectId()
                ) &&
                matchesOptionalTarget(
                    constraint.classIds(),
                    block.getClassId()
                ) &&
                validLimit(
                    constraint.valueInt()
                )
            ) {
                subjectMaxDaily =
                    minimum(
                        subjectMaxDaily,
                        constraint.valueInt()
                    );

                continue;
            }

            if (
                "SOFT".equals(
                    strength
                ) &&
                "SUBJECT_PREFERRED".equals(
                    type
                ) &&
                contains(
                    constraint.subjectIds(),
                    block.getSubjectId()
                ) &&
                matchesOptionalTarget(
                    constraint.classIds(),
                    block.getClassId()
                )
            ) {
                Set<String> slotKeys =
                    preferredSlotKeys(
                        slots,
                        constraint
                    );

                if (
                    !slotKeys.isEmpty()
                ) {
                    preferred.add(
                        new PreferredSlotRuleV1(
                            slotKeys,
                            Math.max(
                                1,
                                constraint.weight()
                            )
                        )
                    );
                }
            }
        }

        block.setTeacherMaxDaily(
            teacherMaxDaily
        );

        block.setTeacherMaxConsecutive(
            teacherMaxConsecutive
        );

        block.setSubjectMaxDaily(
            subjectMaxDaily
        );

        block.setPreferredSlotRules(
            preferred
        );
    }

    private Set<String> preferredSlotKeys(
        List<PlanningSlotV1> slots,
        TimetableSolveRequestV1.ConstraintInput constraint
    ) {
        Set<String> result =
            new HashSet<>();

        for (
            PlanningSlotV1 slot :
            slots
        ) {
            boolean match =
                false;

            if (
                constraint.slots() != null &&
                !constraint.slots().isEmpty()
            ) {
                match =
                    constraint
                        .slots()
                        .stream()
                        .anyMatch(
                            item ->
                                item.dayId().equals(
                                    slot.dayId()
                                ) &&
                                item.periodId().equals(
                                    slot.periodId()
                                )
                        );
            }
            else {
                boolean hasDays =
                    constraint.dayIds() != null &&
                    !constraint.dayIds().isEmpty();

                boolean hasPeriods =
                    constraint.periodIds() != null &&
                    !constraint.periodIds().isEmpty();

                boolean dayMatch =
                    !hasDays ||
                    constraint
                        .dayIds()
                        .contains(
                            slot.dayId()
                        );

                boolean periodMatch =
                    !hasPeriods ||
                    constraint
                        .periodIds()
                        .contains(
                            slot.periodId()
                        );

                match =
                    (hasDays || hasPeriods) &&
                    dayMatch &&
                    periodMatch;
            }

            if (
                match
            ) {
                result.add(
                    slot.key()
                );
            }
        }

        return result;
    }

    private void validateRequest(
        TimetableSolveRequestV1 request
    ) {
        if (
            request == null
        ) {
            throw new IllegalArgumentException(
                "REQUEST_REQUIRED"
            );
        }

        if (
            request.contractVersion() == null ||
            !"1".equals(
                request.contractVersion()
            )
        ) {
            throw new IllegalArgumentException(
                "UNSUPPORTED_CONTRACT_VERSION"
            );
        }

        if (
            request.projectId() == null ||
            request.projectId().isBlank()
        ) {
            throw new IllegalArgumentException(
                "PROJECT_ID_REQUIRED"
            );
        }

        if (
            request.days() == null ||
            request.days().isEmpty() ||
            request.periods() == null ||
            request.periods().isEmpty() ||
            request.assignments() == null ||
            request.assignments().isEmpty()
        ) {
            throw new IllegalArgumentException(
                "INCOMPLETE_TIMETABLE_PROBLEM"
            );
        }
    }

    private boolean contains(
        List<String> values,
        String value
    ) {
        return values != null &&
            values.contains(
                value
            );
    }

    private boolean matchesOptionalTarget(
        List<String> values,
        String value
    ) {
        return values == null ||
            values.isEmpty() ||
            values.contains(
                value
            );
    }

    private boolean validLimit(
        Integer value
    ) {
        return value != null &&
            value > 0;
    }

    private Integer minimum(
        Integer current,
        Integer next
    ) {
        return current == null
            ? next
            : Math.min(
                current,
                next
            );
    }
}