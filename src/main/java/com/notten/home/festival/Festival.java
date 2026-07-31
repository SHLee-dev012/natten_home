package com.notten.home.festival;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/** Top-level festival info shown on the home page. */
public record Festival(
        String name,
        String tagline,
        String location,
        LocalDate startDate,
        LocalDate endDate) {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("M월 d일");

    /** e.g. "7월 25일 – 26일" (drops the redundant month on the end date). */
    public String dateRange() {
        String start = startDate.format(DAY);
        String end = startDate.getMonthValue() == endDate.getMonthValue()
                ? endDate.getDayOfMonth() + "일"
                : endDate.format(DAY);
        return start + " – " + end;
    }
}
