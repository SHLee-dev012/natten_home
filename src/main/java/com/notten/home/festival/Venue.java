package com.notten.home.festival;

import java.util.List;

/** Where the festival is held, mirroring the "오시는 길" section of the home page. */
public record Venue(
        String name,
        String address,
        List<String> areas,
        String mapUrl) {
}
