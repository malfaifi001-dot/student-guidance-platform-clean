package com.teachix.timetable.v1.domain;

import java.util.Set;

public record PreferredSlotRuleV1(
    Set<String> slotKeys,
    int weight
) {
}