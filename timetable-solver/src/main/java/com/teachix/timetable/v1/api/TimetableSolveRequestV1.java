package com.teachix.timetable.v1.api;

import java.util.List;
import java.util.Map;

public record TimetableSolveRequestV1(
    String contractVersion,
    String projectId,
    List<DayInput> days,
    List<PeriodInput> periods,
    List<TeacherInput> teachers,
    List<ClassInput> classes,
    List<SubjectInput> subjects,
    List<AssignmentInput> assignments,
    List<ConstraintInput> constraints,
    SolveOptions options,
    String requestId
) {

    public record DayInput(
        String id,
        String label,
        int order
    ) {
    }

    public record PeriodInput(
        String id,
        String label,
        int order
    ) {
    }

    public record TeacherInput(
        String id,
        String name,
        Integer maxWeeklyLoad
    ) {
    }

    public record ClassInput(
        String id,
        String name
    ) {
    }

    public record SubjectInput(
        String id,
        String name
    ) {
    }

    public record FixedSlotInput(
        String dayId,
        String periodId,
        boolean locked
    ) {
    }

    public record AssignmentInput(
        String id,
        String teacherId,
        String classId,
        String subjectId,
        int assignedLessons,
        int singlePeriods,
        int doublePeriods,
        List<FixedSlotInput> fixedSlots
    ) {
    }

    public record SlotInput(
        String dayId,
        String periodId
    ) {
    }

    public record ConstraintInput(
        String id,
        String type,
        String strength,
        Integer valueInt,
        int weight,
        List<String> teacherIds,
        List<String> subjectIds,
        List<String> classIds,
        List<String> dayIds,
        List<String> periodIds,
        List<SlotInput> slots,
        Map<String, Object> config
    ) {
    }

    public record SolveOptions(
        Long seed,
        Integer spentLimitSeconds
    ) {
    }
}
