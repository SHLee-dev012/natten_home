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
     * A single time block within a zone. Hours are 24h (e.g. 11–17).
     * {@code day}: 0 = both days, 1 = day 1 only, 2 = day 2 only.
     */
    public record Slot(int start, int end, String content, int day, String description) {

        /** Whether this slot runs on the given day number (1 or 2). */
        public boolean on(int d) {
            return day == 0 || day == d;
        }

        /** e.g. "11:00–17:00". */
        public String time() {
            return String.format("%02d:00–%02d:00", start, end);
        }
    }
}
