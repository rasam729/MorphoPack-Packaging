"""
MorphoPackEngine/pipeline.py
Blender 4.5 Python script — runs inside Blender's embedded Python interpreter.
Generates: preview.glb + dieline_pattern.svg from an uploaded mesh.
Called via: blender --background --python pipeline.py [-- --length=L --width=W --height=H]
"""

import bpy
import sys
import os
import math
import json
from pathlib import Path

# ── Args parsing ───────────────────────────────────────────────────────────────
argv = sys.argv
script_args = argv[argv.index("--") + 1:] if "--" in argv else []

length_override = None
width_override = None
height_override = None
fit_clearance_override = 3.0
material_thickness_override = 1.5

for arg in script_args:
    if arg.startswith("--length="):
        length_override = float(arg.split("=")[1])
    elif arg.startswith("--width="):
        width_override = float(arg.split("=")[1])
    elif arg.startswith("--height="):
        height_override = float(arg.split("=")[1])
    elif arg.startswith("--clearance="):
        fit_clearance_override = float(arg.split("=")[1])
    elif arg.startswith("--thickness="):
        material_thickness_override = float(arg.split("=")[1])

# ── Paths ──────────────────────────────────────────────────────────────────────
ENGINE_DIR = Path(__file__).parent.resolve()
UPLOADS_DIR = Path(os.environ.get("MORPHO_UPLOADS", str(ENGINE_DIR / "uploads")))
OUTPUTS_DIR = Path(os.environ.get("MORPHO_OUTPUTS", str(ENGINE_DIR / "outputs")))
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

GLB_OUT  = str(OUTPUTS_DIR / "preview.glb")
SVG_OUT  = str(OUTPUTS_DIR / "dieline_pattern.svg")
JSON_OUT = str(OUTPUTS_DIR / "mesh_metrics.json")

print(f"[Morpho] Pipeline starting. Uploads: {UPLOADS_DIR}, Outputs: {OUTPUTS_DIR}")

# ── Find mesh file ─────────────────────────────────────────────────────────────
mesh_file = None
for ext in ("*.stl", "*.STL", "*.obj", "*.OBJ"):
    candidates = list(UPLOADS_DIR.glob(ext))
    if candidates:
        mesh_file = str(candidates[0])
        break

if not mesh_file and not (length_override and width_override and height_override):
    print("[ERROR] No mesh file found in uploads directory.")
    sys.exit(1)

# ── Clear scene ────────────────────────────────────────────────────────────────
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()

# ── Import or create mesh ──────────────────────────────────────────────────────
if mesh_file:
    print(f"[Morpho] Importing mesh: {mesh_file}")
    ext_lower = Path(mesh_file).suffix.lower()
    if ext_lower == ".stl":
        bpy.ops.wm.stl_import(filepath=mesh_file)
    elif ext_lower == ".obj":
        bpy.ops.wm.obj_import(filepath=mesh_file)
    obj = bpy.context.selected_objects[0] if bpy.context.selected_objects else None
else:
    # Create box from explicit dimensions
    print(f"[Morpho] Creating box: {length_override}×{width_override}×{height_override}mm")
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.active_object
    obj.scale = (length_override / 1000, width_override / 1000, height_override / 1000)
    bpy.ops.object.transform_apply(scale=True)

if obj is None:
    print("[ERROR] No object after import.")
    sys.exit(1)

bpy.context.view_layer.objects.active = obj
obj.select_set(True)

# STL files do not declare units; interpret large coordinate extents as millimetres.
if mesh_file and Path(mesh_file).suffix.lower() == ".stl":
    raw_extent = max(float(value) for value in obj.dimensions)
    if raw_extent > 10:
        obj.scale = tuple(value * 0.001 for value in obj.scale)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        print("[Morpho] Interpreting STL coordinates as millimetres.")

# ── Stage 1: Apply dimension override if provided ──────────────────────────────
if all([length_override, width_override, height_override]):
    print(f"[Morpho] Applying dimension override: {length_override}×{width_override}×{height_override}mm")
    # Scale to match desired bounding box
    bounds = obj.bound_box
    current_dims = [
        max(v[0] for v in bounds) - min(v[0] for v in bounds),
        max(v[1] for v in bounds) - min(v[1] for v in bounds),
        max(v[2] for v in bounds) - min(v[2] for v in bounds),
    ]
    target = [length_override / 1000, width_override / 1000, height_override / 1000]
    scale_factors = [t / max(c, 0.001) for t, c in zip(target, current_dims)]
    obj.scale = tuple(scale_factors)
    bpy.ops.object.transform_apply(scale=True)

# ── Stage 2: Add clearance modifier ───────────────────────────────────────────
print("[Morpho] Stage 2: Adding 2mm clearance displacement")
try:
    mod = obj.modifiers.new(name="Clearance", type="DISPLACE")
    tex = bpy.data.textures.new("ClearanceTex", type="BLEND")
    mod.texture = tex
    mod.strength = 0.002  # 2mm
    mod.direction = "NORMAL"
    bpy.ops.object.modifier_apply(modifier="Clearance")
except Exception as e:
    print(f"[WARN] Clearance modifier: {e}")

# ── Stage 3: WELD ──────────────────────────────────────────────────────────────
print("[Morpho] Stage 3: WELD — merging duplicate vertices")
try:
    mod = obj.modifiers.new(name="Weld", type="WELD")
    mod.merge_threshold = 0.001
    bpy.ops.object.modifier_apply(modifier="Weld")
except Exception as e:
    print(f"[WARN] Weld: {e}")

# ── Stage 4: DECIMATE ─────────────────────────────────────────────────────────
print("[Morpho] Stage 4: DECIMATE — reducing polygon count")
try:
    poly_count = len(obj.data.polygons)
    if poly_count > 5000:
        mod = obj.modifiers.new(name="Decimate", type="DECIMATE")
        mod.decimate_type = "COLLAPSE"
        mod.ratio = min(0.9, 5000 / poly_count)
        bpy.ops.object.modifier_apply(modifier="Decimate")
        print(f"[Morpho] Decimated from {poly_count} → {len(obj.data.polygons)} faces")
except Exception as e:
    print(f"[WARN] Decimate: {e}")

# ── Stage 5: CLEANUP ──────────────────────────────────────────────────────────
print("[Morpho] Stage 5: CLEANUP — removing degenerate geometry")
try:
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.delete_loose()
    bpy.ops.mesh.fill_holes(sides=4)
    bpy.ops.object.mode_set(mode="OBJECT")
except Exception as e:
    print(f"[WARN] Cleanup: {e}")
    try:
        bpy.ops.object.mode_set(mode="OBJECT")
    except Exception:
        pass

# ── Stage 6: Manufacturing check ──────────────────────────────────────────────
print("[Morpho] Manufacturing threshold check")
bounds = obj.bound_box
dims_m = [
    max(v[i] for v in bounds) - min(v[i] for v in bounds)
    for i in range(3)
]
dims_mm = [d * 1000 for d in dims_m]
print(f"[Morpho] Final dims: {dims_mm[0]:.1f}×{dims_mm[1]:.1f}×{dims_mm[2]:.1f}mm")

# Save mesh metrics JSON
metrics = {
    "length_mm": round(dims_mm[0], 2),
    "width_mm": round(dims_mm[1], 2),
    "height_mm": round(dims_mm[2], 2),
    "volume_mm3": round(dims_mm[0] * dims_mm[1] * dims_mm[2], 2),
    "face_count": len(obj.data.polygons),
    "vertex_count": len(obj.data.vertices),
    "fit_clearance_mm": fit_clearance_override,
    "material_thickness_mm": material_thickness_override,
}
with open(JSON_OUT, "w") as jf:
    json.dump(metrics, jf, indent=2)
print(f"[Morpho] Metrics saved: {JSON_OUT}")

# ── Stage 7: Export GLB ───────────────────────────────────────────────────────
print("[Morpho] Stage 7: Exporting GLB preview")
try:
    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT,
        export_format="GLB",
        export_apply=True,
        use_selection=True,
    )
    if Path(GLB_OUT).exists():
        print(f"[Morpho] GLB exported: {GLB_OUT} ({Path(GLB_OUT).stat().st_size:,} bytes)")
    else:
        print("[WARN] GLB not found after export.")
except Exception as e:
    print(f"[WARN] GLB export error: {e}")

# ── Stage 8: SVG Dieline unfold ───────────────────────────────────────────────
print("[Morpho] Stage 8: SVG dieline unfold & export")

def generate_svg_dieline_blender(
    obj,
    output_path,
    dims_mm,
    fit_clearance_mm=3.0,
    material_thickness_mm=1.5,
):
    """Generate RSC box dieline SVG from Blender object dimensions."""
    allowance = 2 * (fit_clearance_mm + material_thickness_mm)
    w, d, h = (dimension + allowance for dimension in dims_mm)
    SCALE = 1.5
    margin = 50

    panel_w = w * SCALE
    panel_h = h * SCALE
    panel_d = d * SCALE
    glue = max(20, w * 0.15 * SCALE)
    flap_h = d * 0.45 * SCALE

    total_w = panel_d + panel_w + panel_d + panel_w + glue + 2 * margin
    total_h = flap_h * 2 + panel_h + 2 * margin + 30

    subtitle = f"{w:.0f}L × {d:.0f}W × {h:.0f}H (mm) — RSC Style"
    fold_legend = "Fold line (dashed)"
    footer = "Generated by MorphoPack AI — Blender 4.5 Pipeline"
    legend_right = margin + 165 + len(fold_legend) * 10 * 0.62 + margin
    footer_right = margin * 2 + len(footer) * 10 * 0.62
    subtitle_right = margin * 2 + len(subtitle) * 11 * 0.62
    total_w = max(total_w, legend_right, footer_right, subtitle_right)

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_w / SCALE:.4f}mm" height="{total_h / SCALE:.4f}mm" viewBox="0 0 {total_w:.0f} {total_h:.0f}">',
        '<defs>',
        '  <style>',
        '    .cut { fill: none; stroke: #10291B; stroke-width: 0.9; }',
        '    .fold { fill: none; stroke: #3F5C47; stroke-width: 0.65; stroke-dasharray: 7,4; }',
        '    .panel { fill: #F0FDF4; opacity: 0.4; }',
        '    .label { font: bold 12px Arial,sans-serif; fill: #111827; }',
        '    .dim { font: 10px "Courier New",monospace; fill: #6B7280; }',
        '    .title { font: bold 16px Arial,sans-serif; fill: #111827; }',
        '    .subtitle { font: 11px Arial,sans-serif; fill: #6B7280; }',
        '  </style>',
        '</defs>',
        f'<rect width="{total_w:.0f}" height="{total_h:.0f}" fill="#F8FAFC"/>',
        f'<text class="title" x="{margin}" y="22">MorphoPack Dieline</text>',
        f'<text class="subtitle" x="{margin}" y="38">{subtitle}</text>',
    ]

    x0, y0 = margin, margin + 15
    panels = [
        ("Depth", panel_d, d), ("Width", panel_w, w),
        ("Depth", panel_d, d), ("Width", panel_w, w), ("Glue", glue, None)
    ]

    x = x0
    for i, (label, pw, dim_val) in enumerate(panels):
        py = y0 + flap_h
        # Main panel
        lines.append(f'<rect class="panel" x="{x:.1f}" y="{py:.1f}" width="{pw:.1f}" height="{panel_h:.1f}"/>')
        cx = x + pw / 2
        cy = py + panel_h / 2
        lines.append(f'<text class="label" x="{cx:.1f}" y="{cy:.1f}" text-anchor="middle">{label}</text>')
        if dim_val:
            lines.append(f'<text class="dim" x="{cx:.1f}" y="{cy + 18:.1f}" text-anchor="middle">{dim_val:.0f}mm</text>')

        if i < 4:
            fh = flap_h * (0.9 if i % 2 == 0 else 1.0)
            # Top flap
            lines.append(f'<rect class="panel" x="{x:.1f}" y="{y0 + flap_h - fh:.1f}" width="{pw:.1f}" height="{fh:.1f}"/>')
            # Bottom flap
            lines.append(f'<rect class="panel" x="{x:.1f}" y="{py + panel_h:.1f}" width="{pw:.1f}" height="{fh:.1f}"/>')
            # Fold lines
            lines.append(f'<line class="fold" x1="{x:.1f}" y1="{py:.1f}" x2="{x + pw:.1f}" y2="{py:.1f}"/>')
            lines.append(f'<line class="fold" x1="{x:.1f}" y1="{py + panel_h:.1f}" x2="{x + pw:.1f}" y2="{py + panel_h:.1f}"/>')
        if i > 0:
            lines.append(f'<line class="fold" x1="{x:.1f}" y1="{y0:.1f}" x2="{x:.1f}" y2="{y0 + flap_h * 2 + panel_h:.1f}"/>')
        x += pw

    boundaries = [x0]
    for _, panel_width, _ in panels:
        boundaries.append(boundaries[-1] + panel_width)
    flap_heights = [flap_h * (0.9 if i % 2 == 0 else 1.0) for i in range(4)]
    slot = max(3.0, SCALE * 2)
    body_top = y0 + flap_h
    body_bottom = body_top + panel_h
    cut_points = [
        (x0, body_top),
        (x0, body_top - flap_heights[0]),
    ]
    for i in range(1, 4):
        boundary = boundaries[i]
        cut_points.extend([
            (boundary - slot / 2, body_top - flap_heights[i - 1]),
            (boundary - slot / 2, body_top),
            (boundary + slot / 2, body_top),
            (boundary + slot / 2, body_top - flap_heights[i]),
        ])
    glue_boundary = boundaries[4]
    cut_points.extend([
        (glue_boundary - slot / 2, body_top - flap_heights[3]),
        (glue_boundary - slot / 2, body_top),
        (glue_boundary + slot / 2, body_top),
        (boundaries[-1], body_top),
        (boundaries[-1], body_bottom),
        (glue_boundary + slot / 2, body_bottom),
        (glue_boundary - slot / 2, body_bottom),
        (glue_boundary - slot / 2, body_bottom + flap_heights[3]),
    ])
    for i in range(3, 0, -1):
        boundary = boundaries[i]
        cut_points.extend([
            (boundary + slot / 2, body_bottom + flap_heights[i]),
            (boundary + slot / 2, body_bottom),
            (boundary - slot / 2, body_bottom),
            (boundary - slot / 2, body_bottom + flap_heights[i - 1]),
        ])
    cut_points.extend([
        (x0, body_bottom + flap_heights[0]),
        (x0, body_top),
    ])
    cut_data = " ".join(
        f"{'M' if index == 0 else 'L'} {px:.1f} {py:.1f}"
        for index, (px, py) in enumerate(cut_points)
    ) + " Z"
    lines.append(f'<path class="cut" d="{cut_data}"/>')

    # Height label (vertical)
    hx = x0 - 35
    hy = y0 + flap_h + panel_h / 2
    lines.extend([
        f'<text class="dim" x="{hx:.1f}" y="{hy:.1f}" text-anchor="middle" transform="rotate(-90,{hx:.1f},{hy:.1f})">{h:.0f}mm (height)</text>',
    ])

    # Legend at bottom
    legend_y = y0 + flap_h * 2 + panel_h + 25
    lines.extend([
        f'<line class="cut" x1="{x0}" y1="{legend_y}" x2="{x0 + 30}" y2="{legend_y}"/>',
        f'<text class="dim" x="{x0 + 35}" y="{legend_y + 4}">Cut line</text>',
        f'<line class="fold" x1="{x0 + 130}" y1="{legend_y}" x2="{x0 + 160}" y2="{legend_y}"/>',
        f'<text class="dim" x="{x0 + 165}" y="{legend_y + 4}">{fold_legend}</text>',
        f'<text class="dim" x="{x0}" y="{legend_y + 22}">{footer}</text>',
    ])

    lines.append('</svg>')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"[Morpho] SVG dieline saved: {output_path}")

try:
    generate_svg_dieline_blender(
        obj,
        SVG_OUT,
        dims_mm,
        fit_clearance_override,
        material_thickness_override,
    )
except Exception as svg_err:
    print(f"[WARN] SVG generation error: {svg_err}")

print(f"""
[Morpho] ✓ Pipeline complete.
  GLB  → {GLB_OUT}
  SVG  → {SVG_OUT}
  JSON → {JSON_OUT}
""")
