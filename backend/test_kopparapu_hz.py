import numpy as np

from kopparapu_hz import (
    RUNAWAY_GREENHOUSE,
    MAXIMUM_GREENHOUSE,
    calculate_flux_boundary,
    classify_habitable_zone,
)


# Test 1: Solar-temperature boundaries.
inner = calculate_flux_boundary(
    5780, RUNAWAY_GREENHOUSE
)

outer = calculate_flux_boundary(
    5780, MAXIMUM_GREENHOUSE
)

print("Solar-temperature test")
print("----------------------")
print("Inner boundary:", inner)
print("Outer boundary:", outer)

assert np.isclose(inner, 1.107)
assert np.isclose(outer, 0.356)


# Test 2: Classification.
print("\nClassification tests")
print("--------------------")

assert classify_habitable_zone(5780, 1.0) == (
    "Within conservative habitable zone"
)

assert classify_habitable_zone(5780, 1.5) == (
    "Inside inner boundary"
)

assert classify_habitable_zone(5780, 0.2) == (
    "Beyond outer boundary"
)

assert classify_habitable_zone(7500, 1.0) == (
    "Outside model temperature range"
)

assert classify_habitable_zone(5780, np.nan) == (
    "Invalid data"
)

print("All classification tests passed!")