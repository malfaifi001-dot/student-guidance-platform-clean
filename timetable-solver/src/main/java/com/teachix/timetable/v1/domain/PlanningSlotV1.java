package com.teachix.timetable.v1.domain;

public record PlanningSlotV1(
    String dayId,
    String dayLabel,
    int dayOrder,
    String periodId,
    String periodLabel,
    int periodOrder
) {

    public String key() {
        return dayId
            + ":"
            + periodId;
    }
}