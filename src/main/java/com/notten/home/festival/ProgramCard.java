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

    /** e.g. "4F 캠퍼스 낭만존". */
    public String place() {
        return floor + " " + zone;
    }

    /** Whether this program runs on only one of the two days. */
    public boolean daySpecific() {
        return day != 0;
    }

    /** "1일차" / "2일차" for day-specific programs. */
    public String dayLabel() {
        return day + "일차";
    }
}
