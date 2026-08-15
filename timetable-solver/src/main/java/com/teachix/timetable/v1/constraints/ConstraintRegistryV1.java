package com.teachix.timetable.v1.constraints;

import java.util.Set;

import com.teachix.timetable.v1.api.TimetableSolveRequestV1;

public final class ConstraintRegistryV1 {

    private ConstraintRegistryV1() {
    }

    private static final Set<String> HARD =
        Set.of(
            "TEACHER_DAY_OFF",
            "TEACHER_UNAVAILABLE",
            "TEACHER_MAX_DAILY",
            "TEACHER_MAX_CONSECUTIVE",
            "SUBJECT_BLOCKED",
            "SUBJECT_MAX_DAILY",
            "CLASS_BLOCKED_SLOT",
            "SCHOOL_BLOCKED_SLOT"
        );

    private static final Set<String> SOFT =
        Set.of(
            "SUBJECT_PREFERRED",
            "TEACHER_PREFERRED"
        );

    public static void validate(
        TimetableSolveRequestV1.ConstraintInput constraint
    ) {
        String type =
            canonicalType(
                constraint.type()
            );

        String strength =
            constraint.strength() != null
                ? constraint.strength()
                : "HARD";

        boolean supported =
            "HARD".equals(
                strength
            )
                ? HARD.contains(
                    type
                )
                : "SOFT".equals(
                    strength
                ) &&
                    SOFT.contains(
                        type
                    );

        if (
            !supported
        ) {
            throw new IllegalArgumentException(
                "UNSUPPORTED_CONSTRAINT:"
                    + constraint.id()
                    + ":"
                    + constraint.type()
                    + ":"
                    + strength
            );
        }
    }

    public static String canonicalType(
        String type
    ) {
        if (
            type == null
        ) {
            return "";
        }

        return switch (
            type
        ) {
            case "TEACHER_UNAVAILABLE_SLOT" ->
                "TEACHER_UNAVAILABLE";

            case "TEACHER_DAILY_LIMIT",
                 "TEACHER_MAX_DAILY_PERIODS" ->
                "TEACHER_MAX_DAILY";

            case "TEACHER_CONSECUTIVE_LIMIT",
                 "TEACHER_MAX_CONSECUTIVE_PERIODS" ->
                "TEACHER_MAX_CONSECUTIVE";

            case "SUBJECT_FORBIDDEN_SLOT" ->
                "SUBJECT_BLOCKED";

            case "SUBJECT_DAILY_LIMIT",
                 "SUBJECT_MAX_DAILY_OCCURRENCES" ->
                "SUBJECT_MAX_DAILY";

            case "SCHOOL_BLOCKED_DAY" ->
                "SCHOOL_BLOCKED_SLOT";

            default ->
                type;
        };
    }
}
