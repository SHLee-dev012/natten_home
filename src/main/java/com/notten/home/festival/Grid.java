package com.notten.home.festival;

import java.util.List;
import java.util.stream.Collectors;

/** View model for the time × zone matrix. */
public final class Grid {

    /** First and last hour shown on the time axis (11:00 → 21:00). */
    public static final int START_HOUR = 11;
    public static final int END_HOUR = 21;

    private Grid() {
    }

    /** One program placed in a cell: its label and detail description. */
    public record Item(String content, String description) {
    }

    /** One program block placed in the grid, possibly holding several concurrent items. */
    public record Cell(int start, int end, List<Item> items) {

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

        /** Modal title: all concurrent program labels joined. */
        public String title() {
            return items.stream().map(Item::content).collect(Collectors.joining(" · "));
        }

        /** Modal body: one description, or each program's label + description when concurrent. */
        public String description() {
            if (items.size() == 1) {
                return items.get(0).description();
            }
            return items.stream()
                    .map(it -> it.content() + "\n" + it.description())
                    .collect(Collectors.joining("\n\n"));
        }
    }

    /** One zone column with its placed cells. */
    public record Column(String floor, String zone, String category, String staff, List<Cell> cells) {
    }
}
