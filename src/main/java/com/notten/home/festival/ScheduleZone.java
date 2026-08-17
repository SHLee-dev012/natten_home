package com.notten.home.festival;

import java.util.List;

/** A floor/zone in the festival schedule and its programs, mirroring the 일정표 section. */
public record ScheduleZone(
        String floor,
        String zone,
        String category,
        List<Slot> slots) {

    /**
     * A single program within a zone.
     *
     * <p>{@code time} is the label exactly as the timetable shows it — a range
     * ("13:00–19:00"), "상시", or "시간 추후 확정" for slots still being fixed.
     * {@code day}: 0 = both days, 1 = 토요일(9/12) only, 2 = 일요일(9/13) only.
     */
    public record Slot(String time, String content, int day, String description) {
    }
}
