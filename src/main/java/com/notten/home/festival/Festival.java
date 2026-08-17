package com.notten.home.festival;

import java.time.LocalDate;

/** Top-level festival info, mirroring the cover/overview section of the home page. */
public record Festival(
        String name,
        String tagline,
        String eyebrow,
        LocalDate startDate,
        LocalDate endDate) {
}
