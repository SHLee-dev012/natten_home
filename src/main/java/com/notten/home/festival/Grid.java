package com.notten.home.festival;

import java.util.List;

/** View model for the time × zone matrix. */
public final class Grid {

    /** First and last hour shown on the time axis (11:00 → 21:00). */
    public static final int START_HOUR = 11;
    public static final int END_HOUR = 21;

    private Grid() {
    }

    /** One program block placed in the grid, possibly holding several concurrent items. */
    public record Cell(int start, int end, List<String> items) {

        /** CSS grid row line where this cell begins.
         *  Rows: 1 = zone headers, 2.. = hours (hour 11 → line 2).
         *  Prep/teardown now render as a caption outside the grid. */
        public int rowStart() {
            return start - START_HOUR + 2;
        }

        /** Number of hourly rows this cell spans. */
        public int rowSpan() {
            return end - start;
        }

        public String time() {
            return String.format("%02d:00–%02d:00", start, end);
        }
    }

    /** One zone column with its placed cells. */
    public record Column(String floor, String zone, String category, String staff, List<Cell> cells) {
    }
}
