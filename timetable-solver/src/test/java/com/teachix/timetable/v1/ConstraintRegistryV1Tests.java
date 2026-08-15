package com.teachix.timetable.v1;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.Map;

import com.teachix.timetable.v1.api.TimetableSolveRequestV1;
import com.teachix.timetable.v1.constraints.ConstraintRegistryV1;

import org.junit.jupiter.api.Test;

class ConstraintRegistryV1Tests {

    @Test
    void acceptsTeacherPreferredAsSoft() {
        assertDoesNotThrow(
            () ->
                ConstraintRegistryV1.validate(
                    constraint(
                        "TEACHER_PREFERRED",
                        "SOFT"
                    )
                )
        );
    }

    @Test
    void rejectsTeacherPreferredAsHard() {
        IllegalArgumentException error =
            assertThrows(
                IllegalArgumentException.class,
                () ->
                    ConstraintRegistryV1.validate(
                        constraint(
                            "TEACHER_PREFERRED",
                            "HARD"
                        )
                    )
            );

        assertEquals(
            "UNSUPPORTED_CONSTRAINT:C1:TEACHER_PREFERRED:HARD",
            error.getMessage()
        );
    }

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

    private TimetableSolveRequestV1.ConstraintInput constraint(
        String type,
        String strength
    ) {
        return new TimetableSolveRequestV1.ConstraintInput(
            "C1",
            type,
            strength,
            null,
            1,
            List.of("T1"),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            Map.of()
        );
    }
}
