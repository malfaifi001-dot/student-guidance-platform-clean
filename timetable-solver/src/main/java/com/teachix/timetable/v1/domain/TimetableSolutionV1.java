package com.teachix.timetable.v1.domain;

import java.util.ArrayList;
import java.util.List;

import ai.timefold.solver.core.api.domain.solution.PlanningEntityCollectionProperty;
import ai.timefold.solver.core.api.domain.solution.PlanningScore;
import ai.timefold.solver.core.api.domain.solution.PlanningSolution;
import ai.timefold.solver.core.api.domain.solution.ProblemFactCollectionProperty;
import ai.timefold.solver.core.api.score.HardSoftScore;

@PlanningSolution
public class TimetableSolutionV1 {

    @ProblemFactCollectionProperty
    private List<PlanningSlotV1> slots;

    @PlanningEntityCollectionProperty
    private List<LessonBlockV1> blocks;

    @PlanningScore
    private HardSoftScore score;

    public TimetableSolutionV1() {
        this.slots =
            new ArrayList<>();

        this.blocks =
            new ArrayList<>();
    }

    public TimetableSolutionV1(
        List<PlanningSlotV1> slots,
        List<LessonBlockV1> blocks
    ) {
        this.slots =
            slots;

        this.blocks =
            blocks;
    }

    public List<PlanningSlotV1> getSlots() {
        return slots;
    }

    public List<LessonBlockV1> getBlocks() {
        return blocks;
    }

    public HardSoftScore getScore() {
        return score;
    }

    public void setScore(
        HardSoftScore score
    ) {
        this.score =
            score;
    }
}