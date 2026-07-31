package com.notten.home.festival;

import java.util.List;

/** A floor/zone in the festival schedule and its time slots. */
public record ScheduleZone(
        String floor,
        String zone,
        String category,
        String staff,
        List<Slot> slots) {

    /**
     * A single time block within a zone.
     * {@code day}: 0 = both days, 1 = day 1 only, 2 = day 2 only.
     */
    public record Slot(String time, String content, int day) {

        /** Whether this slot runs on the given day number (1 or 2). */
        public boolean on(int d) {
            return day == 0 || day == d;
        }
    }
}
