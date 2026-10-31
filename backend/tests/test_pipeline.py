"""
backend/tests/test_pipeline.py
Unit tests for MorphoPack sustainability pipeline.
"""
import pytest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from morpho_pipeline import (
    compute_volume_m3,
    compute_surface_area_m2,
    compute_material_mass_kg,
    compute_co2_saved_kg,
    compute_sustainability_score,
    compute_all_metrics,
    MATERIAL_PROFILES,
)


class TestVolumeCalcs:
    def test_basic_volume(self):
        vol = compute_volume_m3(200, 150, 100)
        assert abs(vol - 0.003) < 1e-6

    def test_zero_dimensions_handled(self):
        vol = compute_volume_m3(1, 1, 1)
        assert vol > 0

    def test_surface_area(self):
        sa = compute_surface_area_m2(200, 150, 100)
        expected = 2 * (0.2 * 0.15 + 0.2 * 0.1 + 0.15 * 0.1)
        assert abs(sa - expected) < 1e-6


class TestMaterialScoring:
    @pytest.mark.parametrize("material", ["mycelium", "cardboard", "kraft"])
    def test_all_materials_score(self, material):
        mass = compute_material_mass_kg(0.1, material)
        assert mass > 0

    def test_co2_saved_positive(self):
        mass = compute_material_mass_kg(0.1, "mycelium")
        saved = compute_co2_saved_kg("mycelium", mass)
        assert saved > 0

    def test_mycelium_saves_more_than_cardboard(self):
        mass = 0.5  # kg
        mycelium_saved = compute_co2_saved_kg("mycelium", mass)
        cardboard_saved = compute_co2_saved_kg("cardboard", mass)
        assert mycelium_saved > cardboard_saved


class TestSustainabilityScore:
    def test_score_in_range(self):
        mass = compute_material_mass_kg(0.1, "cardboard")
        co2 = compute_co2_saved_kg("cardboard", mass)
        score = compute_sustainability_score("cardboard", co2, 50.0, mass, 0)
        assert 0 <= score <= 100

    def test_mycelium_scores_higher(self):
        mass = 0.3
        score_mycelium = compute_sustainability_score(
            "mycelium", compute_co2_saved_kg("mycelium", mass), 80, mass, 0
        )
        score_cardboard = compute_sustainability_score(
            "cardboard", compute_co2_saved_kg("cardboard", mass), 80, mass, 0
        )
        assert score_mycelium > score_cardboard

    def test_degradation_bonus(self):
        mass = 0.3
        co2 = compute_co2_saved_kg("mycelium", mass)
        score_0 = compute_sustainability_score("mycelium", co2, 80, mass, 0)
        score_12 = compute_sustainability_score("mycelium", co2, 80, mass, 12)
        assert score_12 >= score_0


class TestComputeAllMetrics:
    def test_full_metrics_structure(self):
        m = compute_all_metrics(200, 150, 100, "cardboard", 0)
        required_keys = [
            "dimensions", "material", "co2_saved_grams", "sustainability_score",
            "void_reduction_pct", "recyclability_pct", "material_savings_pct",
        ]
        for key in required_keys:
            assert key in m, f"Missing key: {key}"

    def test_score_is_float(self):
        m = compute_all_metrics(200, 150, 100, "mycelium", 6)
        assert isinstance(m["sustainability_score"], float)
        assert 0 <= m["sustainability_score"] <= 100

    def test_all_materials_work(self):
        for mat in MATERIAL_PROFILES:
            m = compute_all_metrics(300, 200, 150, mat, 3)
            assert m["sustainability_score"] >= 0
