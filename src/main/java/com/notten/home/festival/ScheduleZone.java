package com.notten.home.festival;

import java.util.List;

/** A floor/zone in the festival schedule and its time slots. */
public record ScheduleZone(
        String floor,
        String zone,
        String category,
        String staff,
        List<Slot> slots) {

    /** A single time block within a zone. */
    public record Slot(String time, String content) {
    }
}
