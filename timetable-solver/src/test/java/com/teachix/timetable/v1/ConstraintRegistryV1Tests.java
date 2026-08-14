package com.teachix.timetable.v1;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.teachix.timetable.v1.constraints.ConstraintRegistryV1;

import org.junit.jupiter.api.Test;

class ConstraintRegistryV1Tests {

    @Test
    void normalizesTeachixAliases() {
        assertEquals(
            "SUBJECT_MAX_DAILY",
            ConstraintRegistryV1.canonicalType(
                "SUBJECT_DAILY_LIMIT"
            )
        );

        assertEquals(
            "TEACHER_MAX_DAILY",
            ConstraintRegistryV1.canonicalType(
                "TEACHER_DAILY_LIMIT"
            )
        );

        assertEquals(
            "TEACHER_UNAVAILABLE",
            ConstraintRegistryV1.canonicalType(
                "TEACHER_UNAVAILABLE_SLOT"
            )
        );
    }
}