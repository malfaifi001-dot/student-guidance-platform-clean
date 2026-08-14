package com.teachix.timetable.v1.api;

import java.util.List;

public record TimetableSolveResultV1(
    String contractVersion,
    String engine,
    boolean success,
    String projectId,
    String score,
    long hardScore,
    long softScore,
    int requiredSessions,
    int solvedSessions,
    int blockCount,
    long durationMs,
    List<BlockResult> blocks,
    List<Diagnostic> diagnostics
) {

    public record OccupiedSlot(
        String dayId,
        String periodId,
        int periodOrder
    ) {
    }

    public record BlockResult(
        String blockId,
        String assignmentId,
        String teacherId,
        String classId,
        String subjectId,
        int length,
        String startDayId,
        String startPeriodId,
        List<OccupiedSlot> occupiedSlots
    ) {
    }

    public record Diagnostic(
        String code,
        String message,
        String entityId
    ) {
    }
}