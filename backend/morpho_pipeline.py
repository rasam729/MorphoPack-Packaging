"""
backend/morpho_pipeline.py
Core material scoring + sustainability calculation engine.
"""

import math
from typing import Dict, Any

# ── Material property definitions ──────────────────────────────────────────────
MATERIAL_PROFILES = {
    "mycelium": {
        "name": "Agricultural Mycelium",
        "density_kg_m3": 85,
        "co2_per_kg": 0.42,        # kg CO₂e per kg material
        "recyclability": 0.98,     # 0–1
        "biodegradable_months": 1,  # fully biodegradable in ~1 month
        "void_fill_efficiency": 0.95,
        "color": "#22C55E",
    },
    "cardboard": {
        "name": "Corrugated Cardboard",
        "density_kg_m3": 120,
        "co2_per_kg": 0.89,
        "recyclability": 0.87,
        "biodegradable_months": 3,
        "void_fill_efficiency": 0.78,
        "color": "#F59E0B",
    },
    "kraft": {
        "name": "Recycled Kraft",
        "density_kg_m3": 105,
        "co2_per_kg": 0.61,
        "recyclability": 0.92,
        "biodegradable_months": 6,
        "void_fill_efficiency": 0.85,
        "color": "#8B5CF6",
    },
}

# ── Baseline: standard EPS foam packaging ─────────────────────────────────────
BASELINE_EPS = {
    "co2_per_kg": 3.29,
    "recyclability": 0.06,
    "density_kg_m3": 25,
    "biodegradable_months": 5000,
    "void_fill_efficiency": 0.60,
}


def compute_volume_m3(length_mm: float, width_mm: float, height_mm: float) -> float:
    """Convert mm dimensions to m³ volume."""
    return (length_mm / 1000) * (width_mm / 1000) * (height_mm / 1000)


def compute_surface_area_m2(length_mm: float, width_mm: float, height_mm: float) -> float:
    """Compute box surface area in m²."""
    l, w, h = length_mm / 1000, width_mm / 1000, height_mm / 1000
    return 2 * (l * w + l * h + w * h)


def compute_material_mass_kg(surface_area_m2: float, material_key: str, thickness_mm: float = 4.0) -> float:
    """Estimate material mass from surface area and thickness."""
    profile = MATERIAL_PROFILES.get(material_key, MATERIAL_PROFILES["cardboard"])
    thickness_m = thickness_mm / 1000
    volume_material = surface_area_m2 * thickness_m
    return volume_material * profile["density_kg_m3"]


def compute_co2_saved_kg(material_key: str, mass_kg: float) -> float:
    """CO₂ saved vs. EPS baseline."""
    profile = MATERIAL_PROFILES.get(material_key, MATERIAL_PROFILES["cardboard"])
    baseline_co2 = BASELINE_EPS["co2_per_kg"] * mass_kg
    actual_co2 = profile["co2_per_kg"] * mass_kg
    return max(0.0, baseline_co2 - actual_co2)


def compute_material_savings_pct(material_key: str) -> float:
    """Material weight savings vs. EPS (percentage)."""
    profile = MATERIAL_PROFILES.get(material_key, MATERIAL_PROFILES["cardboard"])
    savings = (1 - profile["density_kg_m3"] / BASELINE_EPS["density_kg_m3"])
    return max(0.0, savings * 100)


def compute_void_reduction_pct(material_key: str, product_volume_m3: float, box_volume_m3: float) -> float:
    """Packaging void reduction percentage (tighter fit = higher score)."""
    if box_volume_m3 <= 0:
        return 0.0
    profile = MATERIAL_PROFILES.get(material_key, MATERIAL_PROFILES["cardboard"])
    fill_ratio = min(1.0, product_volume_m3 / box_volume_m3)
    # Morpho-Pack adds void fill material, which increases effective fill
    effective_fill = fill_ratio + (1 - fill_ratio) * profile["void_fill_efficiency"]
    baseline_fill = 0.60  # typical standard packaging void fill
    reduction = (effective_fill - baseline_fill) / (1 - baseline_fill)
    return max(0.0, min(100.0, reduction * 100))


def compute_sustainability_score(
    material_key: str,
    co2_saved_kg: float,
    void_reduction_pct: float,
    mass_kg: float,
    degradation_months: int = 0,
) -> float:
    """
    Integrated Sustainability Score (Sₛ) from 0–100.
    Combines volumetric efficiency, circularity, and carbon metrics.
    """
    profile = MATERIAL_PROFILES.get(material_key, MATERIAL_PROFILES["cardboard"])

    # Carbon sub-score (0–40 pts)
    max_co2 = BASELINE_EPS["co2_per_kg"] * mass_kg
    carbon_score = min(40.0, (co2_saved_kg / max(0.001, max_co2)) * 40)

    # Circularity sub-score (0–35 pts)
    circularity_score = profile["recyclability"] * 35

    # Void efficiency (0–25 pts)
    void_score = (void_reduction_pct / 100) * 25

    # Degradation bonus (0–10 pts additive when decomposed)
    degradation_bonus = min(10, max(0, (degradation_months - profile["biodegradable_months"]) / profile["biodegradable_months"] * 10))

    raw = carbon_score + circularity_score + void_score + degradation_bonus
    return round(min(100.0, max(0.0, raw)), 1)


def compute_dieline_area_m2(length_mm: float, width_mm: float, height_mm: float) -> float:
    """Flat dieline area (unfolded box net) in m²."""
    l, w, h = length_mm, width_mm, height_mm
    # Standard RSC box dieline area formula
    area_mm2 = 2 * (l * w + l * h + w * h) + 4 * h * (l + w) / 10
    return area_mm2 / 1_000_000


def compute_all_metrics(
    length_mm: float,
    width_mm: float,
    height_mm: float,
    material_key: str = "cardboard",
    degradation_months: int = 0,
    product_volume_m3: float | None = None,
    thickness_mm: float = 4.0,
) -> Dict[str, Any]:
    """
    Single entry point — compute all sustainability metrics from box dimensions.
    Returns a metrics dict ready for JSON serialization.
    """
    box_volume_m3 = compute_volume_m3(length_mm, width_mm, height_mm)
    surface_area_m2 = compute_surface_area_m2(length_mm, width_mm, height_mm)
    mass_kg = compute_material_mass_kg(surface_area_m2, material_key, thickness_mm)
    co2_saved_kg = compute_co2_saved_kg(material_key, mass_kg)
    material_savings_pct = compute_material_savings_pct(material_key)
    prod_vol = product_volume_m3 if product_volume_m3 is not None else box_volume_m3 * 0.75
    void_reduction_pct = compute_void_reduction_pct(material_key, prod_vol, box_volume_m3)
    score = compute_sustainability_score(
        material_key, co2_saved_kg, void_reduction_pct, mass_kg, degradation_months
    )
    profile = MATERIAL_PROFILES.get(material_key, MATERIAL_PROFILES["cardboard"])

    return {
        "dimensions": {"length_mm": length_mm, "width_mm": width_mm, "height_mm": height_mm},
        "material": material_key,
        "material_name": profile["name"],
        "box_volume_m3": round(box_volume_m3, 6),
        "surface_area_m2": round(surface_area_m2, 4),
        "material_mass_kg": round(mass_kg, 4),
        "co2_saved_kg": round(co2_saved_kg, 4),
        "co2_saved_grams": round(co2_saved_kg * 1000, 1),
        "material_savings_pct": round(material_savings_pct, 1),
        "material_savings_grams": round(mass_kg * (material_savings_pct / 100) * 1000, 1),
        "void_reduction_pct": round(void_reduction_pct, 1),
        "sustainability_score": score,
        "dieline_area_m2": round(compute_dieline_area_m2(length_mm, width_mm, height_mm), 4),
        "degradation_months": degradation_months,
        "recyclability_pct": round(profile["recyclability"] * 100, 1),
    }


def init_db():
    """Placeholder for DB init — actual init is in server.py."""
    pass
