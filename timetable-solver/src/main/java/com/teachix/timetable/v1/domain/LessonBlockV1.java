package com.teachix.timetable.v1.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import ai.timefold.solver.core.api.domain.common.PlanningId;
import ai.timefold.solver.core.api.domain.entity.PlanningEntity;
import ai.timefold.solver.core.api.domain.valuerange.ValueRangeProvider;
import ai.timefold.solver.core.api.domain.variable.PlanningVariable;

@PlanningEntity
public class LessonBlockV1 {

    @PlanningId
    private String blockId;

    private String assignmentId;

    private String teacherId;

    private String classId;

    private String subjectId;

    private int length;

    @ValueRangeProvider(
        id = "allowedStartSlotRange"
    )
    private List<PlanningSlotV1> allowedStartSlots =
        List.of();

    @PlanningVariable(
        valueRangeProviderRefs = "allowedStartSlotRange"
    )
    private PlanningSlotV1 startSlot;

    private List<PlanningSlotV1> allSlots =
        List.of();

    private Set<String> blockedSlotKeys =
        Set.of();

    private List<PreferredSlotRuleV1> preferredSlotRules =
        List.of();

    private Integer teacherMaxDaily;

    private Integer teacherMaxConsecutive;

    private Integer subjectMaxDaily;

    public LessonBlockV1() {
    }

    public LessonBlockV1(
        String blockId,
        String assignmentId,
        String teacherId,
        String classId,
        String subjectId,
        int length
    ) {
        this.blockId =
            blockId;

        this.assignmentId =
            assignmentId;

        this.teacherId =
            teacherId;

        this.classId =
            classId;

        this.subjectId =
            subjectId;

        this.length =
            length;
    }

    public String getBlockId() {
        return blockId;
    }

    public String getAssignmentId() {
        return assignmentId;
    }

    public String getTeacherId() {
        return teacherId;
    }

    public String getClassId() {
        return classId;
    }

    public String getSubjectId() {
        return subjectId;
    }

    public int getLength() {
        return length;
    }

    public PlanningSlotV1 getStartSlot() {
        return startSlot;
    }

    public void setStartSlot(
        PlanningSlotV1 startSlot
    ) {
        this.startSlot =
            startSlot;
    }

    public List<PlanningSlotV1> getAllowedStartSlots() {
        return allowedStartSlots;
    }

    public void setAllowedStartSlots(
        List<PlanningSlotV1> allowedStartSlots
    ) {
        this.allowedStartSlots =
            allowedStartSlots != null
                ? List.copyOf(
                    allowedStartSlots
                )
                : List.of();
    }

    public void setAllSlots(
        List<PlanningSlotV1> allSlots
    ) {
        this.allSlots =
            allSlots != null
                ? List.copyOf(
                    allSlots
                )
                : List.of();
    }

    public Set<String> getBlockedSlotKeys() {
        return blockedSlotKeys;
    }

    public void setBlockedSlotKeys(
        Set<String> blockedSlotKeys
    ) {
        this.blockedSlotKeys =
            blockedSlotKeys != null
                ? Set.copyOf(
                    blockedSlotKeys
                )
                : Set.of();
    }

    public void setPreferredSlotRules(
        List<PreferredSlotRuleV1> preferredSlotRules
    ) {
        this.preferredSlotRules =
            preferredSlotRules != null
                ? List.copyOf(
                    preferredSlotRules
                )
                : List.of();
    }

    public Integer getTeacherMaxDaily() {
        return teacherMaxDaily;
    }

    public void setTeacherMaxDaily(
        Integer teacherMaxDaily
    ) {
        this.teacherMaxDaily =
            teacherMaxDaily;
    }

    public Integer getTeacherMaxConsecutive() {
        return teacherMaxConsecutive;
    }

    public void setTeacherMaxConsecutive(
        Integer teacherMaxConsecutive
    ) {
        this.teacherMaxConsecutive =
            teacherMaxConsecutive;
    }

    public Integer getSubjectMaxDaily() {
        return subjectMaxDaily;
    }

    public void setSubjectMaxDaily(
        Integer subjectMaxDaily
    ) {
        this.subjectMaxDaily =
            subjectMaxDaily;
    }

    public String getDayId() {
        return startSlot != null
            ? startSlot.dayId()
            : null;
    }

    public List<PlanningSlotV1> occupiedSlots() {
        if (
            startSlot == null
        ) {
            return List.of();
        }

        List<PlanningSlotV1> result =
            new ArrayList<>();

        for (
            int offset = 0;
            offset < length;
            offset++
        ) {
            int targetOrder =
                startSlot.periodOrder()
                + offset;

            PlanningSlotV1 match =
                allSlots
                    .stream()
                    .filter(
                        slot ->
                            slot.dayId().equals(
                                startSlot.dayId()
                            ) &&
                            slot.periodOrder() ==
                                targetOrder
                    )
                    .findFirst()
                    .orElse(
                        null
                    );

            if (
                match == null
            ) {
                return List.of();
            }

            result.add(
                match
            );
        }

        return result;
    }

    public boolean overlaps(
        LessonBlockV1 other
    ) {
        if (
            other == null ||
            startSlot == null ||
            other.startSlot == null
        ) {
            return false;
        }

        Set<String> mine =
            occupiedSlots()
                .stream()
                .map(
                    PlanningSlotV1::key
                )
                .collect(
                    java.util.stream.Collectors.toSet()
                );

        return other
            .occupiedSlots()
            .stream()
            .map(
                PlanningSlotV1::key
            )
            .anyMatch(
                mine::contains
            );
    }

    public boolean usesBlockedSlot() {
        return occupiedSlots()
            .stream()
            .map(
                PlanningSlotV1::key
            )
            .anyMatch(
                blockedSlotKeys::contains
            );
    }

    public int preferencePenalty() {
        if (
            startSlot == null ||
            preferredSlotRules.isEmpty()
        ) {
            return 0;
        }

        List<String> occupied =
            occupiedSlots()
                .stream()
                .map(
                    PlanningSlotV1::key
                )
                .toList();

        int penalty =
            0;

        for (
            PreferredSlotRuleV1 rule :
            preferredSlotRules
        ) {
            boolean fullyPreferred =
                occupied
                    .stream()
                    .allMatch(
                        rule
                            .slotKeys()
                            ::contains
                    );

            if (
                !fullyPreferred
            ) {
                penalty +=
                    Math.max(
                        1,
                        rule.weight()
                    );
            }
        }

        return penalty;
    }
}