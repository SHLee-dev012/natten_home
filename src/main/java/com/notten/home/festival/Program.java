package com.notten.home.festival;

/** A single festival program/highlight entry. */
public record Program(
        String title,
        String category,
        String time,
        String place) {
}
