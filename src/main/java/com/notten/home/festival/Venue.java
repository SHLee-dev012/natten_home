package com.notten.home.festival;

import java.util.List;

/** Where the festival is held. */
public record Venue(
        String name,
        List<String> areas,
        String mapUrl) {

    /** e.g. "4층 · 5층 · 테라스". */
    public String areaLabel() {
        return String.join(" · ", areas);
    }
}
