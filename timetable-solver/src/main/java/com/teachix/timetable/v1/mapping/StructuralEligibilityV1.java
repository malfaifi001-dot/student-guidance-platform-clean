package com.teachix.timetable.v1.mapping;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.teachix.timetable.v1.api.TimetableSolveRequestV1;
import com.teachix.timetable.v1.constraints.ConstraintRegistryV1;
import com.teachix.timetable.v1.domain.LessonBlockV1;
import com.teachix.timetable.v1.domain.PlanningSlotV1;

public final class StructuralEligibilityV1 {

    private StructuralEligibilityV1() {
    }

    public static void configure(
        LessonBlockV1 block,
        List<PlanningSlotV1> allSlots,
        List<TimetableSolveRequestV1.ConstraintInput> constraints
    ) {
        Set<String> blocked =
            new HashSet<>();

        for (
            TimetableSolveRequestV1.ConstraintInput constraint :
            constraints
        ) {
            String strength =
                constraint.strength() != null
                    ? constraint.strength()
                    : "HARD";

            if (
                !"HARD".equals(
                    strength
                )
            ) {
                continue;
            }

            String type =
                ConstraintRegistryV1
                    .canonicalType(
                        constraint.type()
                    );

            if (
                "TEACHER_DAY_OFF".equals(
                    type
                ) &&
                contains(
                    constraint.teacherIds(),
                    block.getTeacherId()
                )
            ) {
                for (
                    PlanningSlotV1 slot :
                    allSlots
                ) {
                    if (
                        contains(
                            constraint.dayIds(),
                            slot.dayId()
                        )
                    ) {
                        blocked.add(
                            slot.key()
                        );
                    }
                }

                continue;
            }

            if (
                "TEACHER_UNAVAILABLE".equals(
                    type
                ) &&
                contains(
                    constraint.teacherIds(),
                    block.getTeacherId()
                )
            ) {
                addMatchingSlots(
                    blocked,
                    allSlots,
                    constraint
                );

                continue;
            }

            if (
                "SUBJECT_BLOCKED".equals(
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
                addMatchingSlots(
                    blocked,
                    allSlots,
                    constraint
                );

                continue;
            }

            if (
                "CLASS_BLOCKED_SLOT".equals(
                    type
                ) &&
                contains(
                    constraint.classIds(),
                    block.getClassId()
                )
            ) {
                addMatchingSlots(
                    blocked,
                    allSlots,
                    constraint
                );

                continue;
            }

            if (
                "SCHOOL_BLOCKED_SLOT".equals(
                    type
                )
            ) {
                addMatchingSlots(
                    blocked,
                    allSlots,
                    constraint
                );
            }
        }

        List<PlanningSlotV1> allowed =
            new ArrayList<>();

        for (
            PlanningSlotV1 candidate :
            allSlots
        ) {
            List<PlanningSlotV1> occupied =
                occupiedFrom(
                    candidate,
                    block.getLength(),
                    allSlots
                );

            if (
                occupied.size() !=
                    block.getLength()
            ) {
                continue;
            }

            boolean touchesBlocked =
                occupied
                    .stream()
                    .map(
                        PlanningSlotV1::key
                    )
                    .anyMatch(
                        blocked::contains
                    );

            if (
                !touchesBlocked
            ) {
                allowed.add(
                    candidate
                );
            }
        }

        if (
            allowed.isEmpty()
        ) {
            throw new IllegalArgumentException(
                "BLOCK_HAS_NO_ALLOWED_START:"
                    + block.getBlockId()
            );
        }

        block.setAllSlots(
            allSlots
        );

        block.setBlockedSlotKeys(
            blocked
        );

        block.setAllowedStartSlots(
            allowed
        );
    }

    public static List<PlanningSlotV1> occupiedFrom(
        PlanningSlotV1 start,
        int length,
        List<PlanningSlotV1> allSlots
    ) {
        List<PlanningSlotV1> result =
            new ArrayList<>();

        for (
            int offset = 0;
            offset < length;
            offset++
        ) {
            int targetOrder =
                start.periodOrder()
                    + offset;

            PlanningSlotV1 slot =
                allSlots
                    .stream()
                    .filter(
                        item ->
                            item.dayId().equals(
                                start.dayId()
                            ) &&
                            item.periodOrder() ==
                                targetOrder
                    )
                    .findFirst()
                    .orElse(
                        null
                    );

            if (
                slot == null
            ) {
                return List.of();
            }

            result.add(
                slot
            );
        }

        return result;
    }

    private static void addMatchingSlots(
        Set<String> target,
        List<PlanningSlotV1> allSlots,
        TimetableSolveRequestV1.ConstraintInput constraint
    ) {
        for (
            PlanningSlotV1 slot :
            allSlots
        ) {
            if (
                matchesSlot(
                    constraint,
                    slot
                )
            ) {
                target.add(
                    slot.key()
                );
            }
        }
    }

    private static boolean matchesSlot(
        TimetableSolveRequestV1.ConstraintInput constraint,
        PlanningSlotV1 slot
    ) {
        if (
            constraint.slots() != null &&
            !constraint.slots().isEmpty()
        ) {
            return constraint
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

        boolean hasDays =
            constraint.dayIds() != null &&
            !constraint.dayIds().isEmpty();

        boolean hasPeriods =
            constraint.periodIds() != null &&
            !constraint.periodIds().isEmpty();

        if (
            !hasDays &&
            !hasPeriods
        ) {
            return false;
        }

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

        return dayMatch &&
            periodMatch;
    }

    private static boolean contains(
        List<String> values,
        String value
    ) {
        return values != null &&
            values.contains(
                value
            );
    }

    private static boolean matchesOptionalTarget(
        List<String> values,
        String value
    ) {
        return values == null ||
            values.isEmpty() ||
            values.contains(
                value
            );
    }
}