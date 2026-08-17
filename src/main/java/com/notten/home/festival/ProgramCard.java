package com.notten.home.festival;

/** A single program entry for the program list, derived from the schedule. */
public record ProgramCard(
        String floor,
        String zone,
        String category,
        String time,
        String title,
        int day,
        String description) {
}
