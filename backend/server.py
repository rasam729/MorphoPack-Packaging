"""
backend/server.py
MorphoPack Flask API — full REST backend for the Morpho-Pack platform.
Runs Blender 4.5 headlessly for dieline generation.
"""

import os
import sys
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass
import uuid
import json
import subprocess
import threading
import shutil
import math
import io
import struct
from pathlib import Path
from datetime import datetime, timezone

import bcrypt
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_file, abort
from flask_cors import CORS
from sqlalchemy import (
    create_engine, MetaData, Table, Column, Integer, String, Boolean,
    Text, JSON, ForeignKey, DateTime, select, insert, update, delete
)
from sqlalchemy.sql import func

# ── Paths ──────────────────────────────────────────────────────────────────────
SERVER_DIR      = Path(__file__).parent.resolve()
ROOT_DIR        = SERVER_DIR.parent
ENGINE_DIR      = ROOT_DIR / "MorphoPackEngine"
UPLOADS_DIR     = ENGINE_DIR / "uploads"
OUTPUTS_DIR     = ENGINE_DIR / "outputs"
CAD_DIR         = ROOT_DIR / "CAD-automation"
PIPELINE_SCRIPT = ENGINE_DIR / "pipeline.py"
UNFOLD_SCRIPT   = ENGINE_DIR / "unfold_pipeline.py"

for d in [UPLOADS_DIR, OUTPUTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

load_dotenv(ROOT_DIR / ".env")

# ── Blender detection ──────────────────────────────────────────────────────────
def _find_blender() -> str:
    env_path = os.environ.get("BLENDER_PATH", "").strip()
    candidates = []
    if env_path and Path(env_path).exists():
        candidates.append(env_path)
    if os.name == "nt":
        candidates.extend([
            r"D:\Blender Foundation\Blender 4.5\blender.exe",
            r"D:\Blender Foundation\Blender 4.4\blender.exe",
            r"D:\Blender Foundation\Blender 4.3\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.5\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.4\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.3\blender.exe",
            r"C:\Program Files (x86)\Blender Foundation\Blender 4.5\blender.exe",
        ])
    else:
        candidates.extend(["/usr/bin/blender", "/usr/local/bin/blender"])
    for c in candidates:
        if c and Path(c).exists():
            return str(Path(c).resolve())
    found = shutil.which("blender")
    return found or "blender"

BLENDER_EXE = _find_blender()
print(f"[MorphoPack] Blender: {BLENDER_EXE}")

# ── Flask app ──────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins="*")

# ── Database ───────────────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{ROOT_DIR / 'morphopack.db'}")
_engine = create_engine(DATABASE_URL, future=True, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
metadata = MetaData()

users_table = Table(
    "users", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("email", String(255), nullable=False, unique=True),
    Column("password_hash", String(255), nullable=True),
    Column("name", String(255)),
    Column("avatar_url", Text, nullable=True),
    Column("google_id", String(255), nullable=True, unique=True),
    Column("is_active", Boolean, nullable=False, server_default="1"),
    Column("created_at", DateTime, server_default=func.now()),
)

upload_history_table = Table(
    "upload_history", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, ForeignKey("users.id"), nullable=True),
    Column("job_id", String(64), nullable=True, index=True),
    Column("file_name", String(512), nullable=False),
    Column("status", String(50), nullable=False, server_default="uploaded"),
    Column("pipeline_result", JSON, nullable=True),
    Column("meta", JSON, nullable=True),
    Column("created_at", DateTime, server_default=func.now()),
)

metadata.create_all(_engine)


def get_conn():
    return _engine.begin()


def _hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def _verify_pw(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())


# ── In-memory job state ────────────────────────────────────────────────────────
_job: dict = {
    "id": None, "status": "idle",
    "step": None, "steps_done": [], "error": None,
    "file": None, "started_at": None, "finished_at": None,
}
_job_lock = threading.Lock()

PIPELINE_STEPS = [
    "Mesh import & validation",
    "Clearance displacement (2mm)",
    "WELD — merge duplicate vertices",
    "DECIMATE — reduce polygon count",
    "CLEANUP — remove degenerate geometry",
    "Manufacturing threshold check",
    "GLB viewport export",
    "SVG dieline unfold & export",
    "Print-ready PDF export",
]


def _update_job(**kw):
    with _job_lock:
        _job.update(kw)


def _load_repaired_mesh(mesh_path: str):
    """Load common STL variants and normalize their geometry before conversion."""
    import numpy as np
    import trimesh

    mesh_bytes = Path(mesh_path).read_bytes()
    loaded = None
    if len(mesh_bytes) >= 84:
        declared_faces = struct.unpack_from("<I", mesh_bytes, 80)[0]
        expected_length = 84 + declared_faces * 50
        header = mesh_bytes[:256].decode("ascii", errors="ignore")
        is_ascii_stl = header.lstrip().lower().startswith("solid") and "facet normal" in header.lower()
        if declared_faces and expected_length <= len(mesh_bytes) and not is_ascii_stl:
            loaded = trimesh.load(
                io.BytesIO(mesh_bytes[:expected_length]),
                file_type="stl",
                force="mesh",
                process=False,
            )
    if loaded is None:
        loaded = trimesh.load(mesh_path, force="mesh", process=False)
    if isinstance(loaded, trimesh.Scene):
        geometries = [
            geometry for geometry in loaded.geometry.values()
            if isinstance(geometry, trimesh.Trimesh) and len(geometry.faces)
        ]
        if not geometries:
            raise ValueError("The STL does not contain any triangle faces.")
        mesh = trimesh.util.concatenate(geometries)
    else:
        mesh = loaded

    if not isinstance(mesh, trimesh.Trimesh) or not len(mesh.faces):
        raise ValueError("The STL does not contain any triangle faces.")
    mesh.remove_infinite_values()
    mesh.update_faces(mesh.nondegenerate_faces())
    mesh.merge_vertices()
    mesh.remove_unreferenced_vertices()
    if not len(mesh.faces) or not np.isfinite(mesh.vertices).all():
        raise ValueError("The STL has no usable finite triangle geometry.")
    mesh.fix_normals()

    extents = mesh.extents
    if not np.isfinite(extents).all() or not np.any(extents > 0):
        raise ValueError("The STL has zero or invalid dimensions.")
    if Path(mesh_path).suffix.lower() == ".stl" and float(np.max(extents)) > 10:
        # STL has no unit metadata; larger raw coordinates are commonly millimetres.
        mesh.apply_scale(0.001)
    return mesh


# ── Fallback dieline generator (no Blender) ────────────────────────────────────
def _generate_svg_dieline(mesh_path: str, output_path: str, length_mm: float = None,
                           width_mm: float = None, height_mm: float = None,
                           fit_clearance_mm: float = 0,
                           material_thickness_mm: float = 0) -> str:
    """Generate a technical SVG dieline from mesh bounding box or explicit dimensions."""
    try:
        import trimesh
        import numpy as np

        if length_mm and width_mm and height_mm:
            w, h, d = length_mm, height_mm, width_mm
        else:
            mesh = _load_repaired_mesh(mesh_path)
            extents = (mesh.bounds[1] - mesh.bounds[0]) * 1000  # convert to mm
            w, h, d = extents[0], extents[1], extents[2]
        package_allowance = 2 * (fit_clearance_mm + material_thickness_mm)
        w += package_allowance
        h += package_allowance
        d += package_allowance
        if not np.isfinite([w, h, d]).all() or min(w, h, d) <= 0:
            raise ValueError("Dieline dimensions must be finite and greater than zero.")

        # RSC box dieline layout (scaled to SVG pixels)
        SCALE = 1.5  # px per mm
        margin = 40
        gap = 10

        # Panels: Left flap | Front | Right flap | Back | Glue flap
        panel_w = w * SCALE
        panel_h = h * SCALE
        panel_d = d * SCALE
        glue_flap = max(20, w * 0.15 * SCALE)

        total_w = panel_d + panel_w + panel_d + panel_w + glue_flap + 2 * margin
        flap_h = d * 0.45 * SCALE
        total_h = flap_h + panel_h + flap_h + 2 * margin

        def px(mm): return round(mm * SCALE, 2)

        title = f"MorphoPack Dieline — {w:.0f}×{d:.0f}×{h:.0f}mm"
        legend_width = margin + 145 + len("Fold line") * 10 * 0.62 + margin
        title_width = margin * 2 + len(title) * 14 * 0.62
        total_w = max(total_w, legend_width, title_width)

        lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_w / SCALE:.4f}mm" height="{total_h / SCALE:.4f}mm" '
            f'viewBox="0 0 {total_w:.0f} {total_h:.0f}">',
            '<style>',
            '  .cut { fill: none; stroke: #10291B; stroke-width: 0.9; }',
            '  .fold { fill: none; stroke: #3F5C47; stroke-width: 0.65; stroke-dasharray: 7,4; }',
            '  .panel { fill: #F0FDF4; stroke: none; opacity: 0.5; }',
            '  .label { font: 11px "DM Sans",Arial,sans-serif; fill: #374151; }',
            '  .dim { font: 10px "DM Mono",monospace; fill: #6B7280; }',
            '  .title { font: 14px "DM Sans",Arial,sans-serif; fill: #111827; font-weight: 700; }',
            '</style>',
            # Background
            f'<rect width="{total_w:.0f}" height="{total_h:.0f}" fill="#FAFAFA"/>',
            # Title
            f'<text class="title" x="{margin}" y="20">{title}</text>',
        ]

        x0 = margin
        y0 = margin + 10

        # Draw panels left to right: [depth|width|depth|width|glue]
        panels = [
            ("Depth", panel_d, panel_h),
            ("Width", panel_w, panel_h),
            ("Depth", panel_d, panel_h),
            ("Width", panel_w, panel_h),
            ("Glue", glue_flap, panel_h),
        ]

        x = x0
        fold_xs = []
        for i, (label, pw, ph) in enumerate(panels):
            # Panel fill
            lines.append(f'<rect class="panel" x="{x:.1f}" y="{y0 + flap_h:.1f}" width="{pw:.1f}" height="{ph:.1f}"/>')
            # Top flap
            if i < 4:
                flap_top_h = flap_h * (0.9 if i % 2 == 0 else 1.0)
                lines.append(f'<rect class="panel" x="{x:.1f}" y="{y0 + flap_h - flap_top_h:.1f}" width="{pw:.1f}" height="{flap_top_h:.1f}"/>')
                lines.append(f'<line class="fold" x1="{x:.1f}" y1="{y0 + flap_h:.1f}" x2="{x + pw:.1f}" y2="{y0 + flap_h:.1f}"/>')
                # Bottom flap
                lines.append(f'<rect class="panel" x="{x:.1f}" y="{y0 + flap_h + ph:.1f}" width="{pw:.1f}" height="{flap_top_h:.1f}"/>')
                lines.append(f'<line class="fold" x1="{x:.1f}" y1="{y0 + flap_h + ph:.1f}" x2="{x + pw:.1f}" y2="{y0 + flap_h + ph:.1f}"/>')
            # Label
            cx = x + pw / 2
            cy = y0 + flap_h + ph / 2
            lines.append(f'<text class="label" x="{cx:.1f}" y="{cy:.1f}" text-anchor="middle">{label}</text>')
            # Dimension
            if label != "Glue":
                dim = w if label == "Width" else d
                lines.append(f'<text class="dim" x="{cx:.1f}" y="{cy + 16:.1f}" text-anchor="middle">{dim:.0f}mm</text>')
            # Fold line between panels
            if i > 0:
                lines.append(f'<line class="fold" x1="{x:.1f}" y1="{y0:.1f}" x2="{x:.1f}" y2="{y0 + flap_h * 2 + ph:.1f}"/>')
                fold_xs.append(x)
            x += pw

        # Trace the flap edges and relief slots instead of cutting a box around the whole net.
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
            f"{'M' if index == 0 else 'L'} {x:.1f} {y:.1f}"
            for index, (x, y) in enumerate(cut_points)
        ) + " Z"
        lines.append(f'<path class="cut" d="{cut_data}"/>')

        # Height dimension arrow
        hy = y0 + flap_h
        lines.extend([
            f'<text class="dim" x="{x0 - 5:.1f}" y="{hy + panel_h/2:.1f}" text-anchor="end" transform="rotate(-90,{x0-5:.1f},{hy+panel_h/2:.1f})">{h:.0f}mm</text>',
        ])

        # Legend
        legend_y = y0 + flap_h * 2 + panel_h + 20
        lines.extend([
            f'<line class="cut" x1="{x0}" y1="{legend_y}" x2="{x0 + 30}" y2="{legend_y}"/>',
            f'<text class="dim" x="{x0 + 35}" y="{legend_y + 4}">Cut line</text>',
            f'<line class="fold" x1="{x0 + 110}" y1="{legend_y}" x2="{x0 + 140}" y2="{legend_y}"/>',
            f'<text class="dim" x="{x0 + 145}" y="{legend_y + 4}">Fold line</text>',
        ])

        lines.append('</svg>')
        svg_content = '\n'.join(lines)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        print(f"[SVG] Generated dieline: {output_path}")
        return output_path

    except Exception as exc:
        raise ValueError(f"Could not generate dieline from the supplied mesh: {exc}") from exc


def _generate_pdf_dieline(svg_path: str, pdf_path: str) -> str:
    """Render the generated SVG onto a custom-size PDF page at a 1:1 physical scale."""
    from reportlab.graphics import renderPDF
    from reportlab.pdfgen import canvas
    from svglib.svglib import svg2rlg

    drawing = svg2rlg(svg_path)
    if drawing is None or not all(
        math.isfinite(value) and value > 0
        for value in (drawing.width, drawing.height)
    ):
        raise ValueError("The generated SVG has no printable dimensions.")

    margin = 28
    page_width = drawing.width + margin * 2
    page_height = drawing.height + margin * 2

    pdf = canvas.Canvas(pdf_path, pagesize=(page_width, page_height))
    pdf.setTitle("MorphoPack manufacturing dieline (1:1 scale)")
    pdf.setSubject("Print at 100% / actual size. Do not fit or scale to page.")
    pdf.saveState()
    pdf.translate(margin, margin)
    renderPDF.draw(drawing, pdf, 0, 0)
    pdf.restoreState()
    pdf.showPage()
    pdf.save()
    return pdf_path


def _generate_pdf_overview(
    svg_path: str,
    pdf_path: str,
    length_mm: float,
    width_mm: float,
    height_mm: float,
    material: str = "cardboard",
    degradation_months: int = 0,
    fit_clearance_mm: float = 0,
    material_thickness_mm: float = 4,
) -> str:
    """Create a compact, fit-to-page design report without changing the 1:1 cut PDF."""
    from reportlab.lib.colors import HexColor
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.pdfgen import canvas
    from reportlab.graphics import renderPDF
    from svglib.svglib import svg2rlg
    from morpho_pipeline import compute_all_metrics

    drawing = svg2rlg(svg_path)
    if drawing is None or not all(
        math.isfinite(value) and value > 0
        for value in (drawing.width, drawing.height)
    ):
        raise ValueError("The generated SVG has no printable dimensions.")

    metrics = compute_all_metrics(
        length_mm,
        width_mm,
        height_mm,
        material,
        degradation_months,
        thickness_mm=material_thickness_mm,
    )
    page_width, page_height = landscape(A4)
    pdf = canvas.Canvas(pdf_path, pagesize=(page_width, page_height))
    pdf.setTitle("MorphoPack dieline overview")
    pdf.setSubject("Fit-to-page design summary; not a manufacturing-scale cut file.")

    margin = 30
    pdf.setFillColor(HexColor("#173D2B"))
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(margin, page_height - 36, "MorphoPack · Dieline overview")
    pdf.setFillColor(HexColor("#53645A"))
    pdf.setFont("Helvetica", 9)
    pdf.drawString(
        margin,
        page_height - 53,
        f"Product: {length_mm:g} × {width_mm:g} × {height_mm:g} mm"
        f"  ·  Fit clearance: {fit_clearance_mm:g} mm  ·  Stock: {material_thickness_mm:g} mm",
    )

    diagram_x = margin
    diagram_y = 84
    diagram_width = 530
    diagram_height = page_height - 165
    original_width, original_height = drawing.width, drawing.height
    scale = min(diagram_width / original_width, diagram_height / original_height)
    drawing.scale(scale, scale)
    pdf.setFillColor(HexColor("#F7FAF7"))
    pdf.setStrokeColor(HexColor("#D7E2D9"))
    pdf.roundRect(
        diagram_x - 8,
        diagram_y - 8,
        diagram_width + 16,
        diagram_height + 16,
        8,
        fill=1,
        stroke=1,
    )
    renderPDF.draw(
        drawing,
        pdf,
        diagram_x + (diagram_width - original_width * scale) / 2,
        diagram_y + (diagram_height - original_height * scale) / 2,
    )

    panel_x = 585
    panel_width = page_width - panel_x - margin
    panel_top = page_height - 76
    pdf.setFillColor(HexColor("#FFFFFF"))
    pdf.setStrokeColor(HexColor("#D7E2D9"))
    pdf.roundRect(panel_x, 82, panel_width, panel_top - 82, 8, fill=1, stroke=1)
    pdf.setFillColor(HexColor("#173D2B"))
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(panel_x + 16, panel_top - 24, "Sustainability snapshot")

    mass_grams = metrics["material_mass_kg"] * 1000
    co2_grams = metrics["co2_saved_grams"]
    package_allowance = 2 * (fit_clearance_mm + material_thickness_mm)
    net_width = 2 * (length_mm + package_allowance) + 2 * (width_mm + package_allowance) + max(13.3, length_mm * 0.15)
    net_height = height_mm + package_allowance + (width_mm + package_allowance) * 0.9
    usable_width, usable_height = 976, 676
    nesting_counts = [
        math.floor(usable_width / net_width) * math.floor(usable_height / net_height),
        math.floor(usable_width / net_height) * math.floor(usable_height / net_width),
    ]
    nested_count = max(nesting_counts)
    offcut_pct = max(
        0,
        min(100, (1 - nested_count * net_width * net_height / (1000 * 700)) * 100),
    )
    rows = [
        ("Material", metrics["material_name"]),
        ("Estimated material mass", f"{mass_grams:.1f} g" if mass_grams < 1000 else f"{mass_grams / 1000:.2f} kg"),
        ("CO2e avoided / unit", f"{co2_grams:.1f} g" if co2_grams < 1000 else f"{co2_grams / 1000:.2f} kg"),
        ("Recyclability", f"{metrics['recyclability_pct']:.1f}%"),
        ("Sustainability score", f"{metrics['sustainability_score']:.0f} / 100"),
        ("Estimated sheet offcut", f"{offcut_pct:.1f}%"),
        ("Estimated units / 1000×700 mm", str(nested_count)),
    ]
    row_y = panel_top - 55
    for label, value in rows:
        pdf.setFillColor(HexColor("#6B7A72"))
        pdf.setFont("Helvetica", 8)
        pdf.drawString(panel_x + 16, row_y, label)
        pdf.setFillColor(HexColor("#16261F"))
        pdf.setFont("Helvetica-Bold", 9)
        pdf.drawRightString(panel_x + panel_width - 16, row_y, value)
        row_y -= 36

    pdf.setStrokeColor(HexColor("#E1E9E1"))
    pdf.line(panel_x + 16, row_y + 12, panel_x + panel_width - 16, row_y + 12)
    pdf.setFillColor(HexColor("#53645A"))
    pdf.setFont("Helvetica", 8)
    pdf.drawString(panel_x + 16, row_y - 4, "Overview is scaled to fit this page.")
    pdf.drawString(panel_x + 16, row_y - 17, "Use the separate manufacturing PDF at 100%.")

    pdf.setFillColor(HexColor("#53645A"))
    pdf.setFont("Helvetica", 8)
    pdf.drawString(
        margin,
        48,
        "Planning estimates only. Confirm material, fit, cutter kerf and nesting with your manufacturer.",
    )
    pdf.save()
    return pdf_path


# ── Background pipeline thread ─────────────────────────────────────────────────
def _run_pipeline_thread(
    blender_exe: str,
    length_mm=None,
    width_mm=None,
    height_mm=None,
    material="cardboard",
    degradation_months=0,
    fit_clearance_mm=3,
    material_thickness_mm=1.5,
):
    _update_job(status="running", step=PIPELINE_STEPS[0], steps_done=[], error=None,
                started_at=datetime.now(timezone.utc).isoformat())

    glb_out = OUTPUTS_DIR / "preview.glb"
    svg_out = OUTPUTS_DIR / "dieline_pattern.svg"
    pdf_out = OUTPUTS_DIR / "dieline_pattern.pdf"
    overview_pdf_out = OUTPUTS_DIR / "dieline_overview.pdf"
    metrics_out = OUTPUTS_DIR / "mesh_metrics.json"

    for f in [glb_out, svg_out, pdf_out, overview_pdf_out, metrics_out]:
        if f.exists():
            f.unlink()

    mesh_files = list(UPLOADS_DIR.glob("*.stl")) + list(UPLOADS_DIR.glob("*.STL")) + \
                 list(UPLOADS_DIR.glob("*.obj")) + list(UPLOADS_DIR.glob("*.OBJ"))
    if (
        mesh_files
        and mesh_files[0].suffix.lower() == ".stl"
        and length_mm
        and width_mm
        and height_mm
        and min(float(length_mm), float(width_mm), float(height_mm)) > 5000
    ):
        # Correct dimensions saved by earlier versions that treated STL millimetres as metres.
        length_mm = float(length_mm) / 1000
        width_mm = float(width_mm) / 1000
        height_mm = float(height_mm) / 1000

    blender_err = None

    # Step 1: Try Blender pipeline
    if Path(blender_exe).exists() and PIPELINE_SCRIPT.exists():
        try:
            cmd = [blender_exe, "--background", "--python", str(PIPELINE_SCRIPT)]
            if length_mm and width_mm and height_mm:
                cmd += ["--", f"--length={length_mm}", f"--width={width_mm}", f"--height={height_mm}"]
            else:
                cmd += ["--"]
            cmd += [f"--clearance={fit_clearance_mm}", f"--thickness={material_thickness_mm}"]
            env = os.environ.copy()
            env["PYTHONIOENCODING"] = "utf-8"
            env["MORPHO_UPLOADS"] = str(UPLOADS_DIR)
            env["MORPHO_OUTPUTS"] = str(OUTPUTS_DIR)
            print(f"[Morpho] Running: {' '.join(cmd)}")
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                    text=True, encoding="utf-8", errors="replace",
                                    cwd=str(ENGINE_DIR), env=env)
            step_idx = 0
            for line in proc.stdout:
                line = line.rstrip()
                if line:
                    safe = line.encode("ascii", "replace").decode("ascii")
                    print(f"  [Blender] {safe}")
                low = line.lower()
                if "import" in low or "compiling" in low:
                    step_idx = max(step_idx, 0)
                elif "displace" in low or "clearance" in low:
                    step_idx = max(step_idx, 1)
                elif "weld" in low:
                    step_idx = max(step_idx, 2)
                elif "decimate" in low:
                    step_idx = max(step_idx, 3)
                elif "cleanup" in low:
                    step_idx = max(step_idx, 4)
                elif "mfg" in low or "manufacturing" in low:
                    step_idx = max(step_idx, 5)
                elif "glb" in low or "gltf" in low:
                    step_idx = max(step_idx, 6)
                elif "svg" in low or "dieline" in low or "unfold" in low:
                    step_idx = max(step_idx, 7)
                _update_job(step=PIPELINE_STEPS[min(step_idx, 7)],
                            steps_done=PIPELINE_STEPS[:step_idx])
            proc.wait()
            if proc.returncode != 0:
                blender_err = f"Blender exit code {proc.returncode}"
        except Exception as exc:
            blender_err = str(exc)
            print(f"[WARN] Blender error: {exc}")
    else:
        blender_err = f"Blender not found: {blender_exe}"
        print(f"[WARN] {blender_err}")

    # Step 2: Python fallback if Blender failed or not available
    if (blender_err or not glb_out.exists() or not svg_out.exists()) and mesh_files:
        mesh_path = str(mesh_files[0])
        print(f"[Fallback] Using Python pipeline for: {mesh_path}")

        try:
            m = _load_repaired_mesh(mesh_path)
            source_extents = m.extents.copy()
            if length_mm and width_mm and height_mm:
                target_extents = [length_mm / 1000, width_mm / 1000, height_mm / 1000]
                m.apply_scale([
                    target / current if current > 0 else 1
                    for target, current in zip(target_extents, source_extents)
                ])
            if blender_err and glb_out.exists():
                glb_out.unlink()
            if not glb_out.exists():
                m.export(str(glb_out))
                print(f"[Fallback] GLB: {glb_out}")
            extents = m.extents * 1000
            metrics = {
                "length_mm": round(float(extents[0]), 2),
                "width_mm": round(float(extents[1]), 2),
                "height_mm": round(float(extents[2]), 2),
                "volume_mm3": round(float(abs(m.volume) * 1e9), 2),
                "face_count": int(len(m.faces)),
                "vertex_count": int(len(m.vertices)),
                "fit_clearance_mm": fit_clearance_mm,
                "material_thickness_mm": material_thickness_mm,
            }
            if length_mm and width_mm and height_mm:
                metrics.update({
                    "length_mm": float(length_mm),
                    "width_mm": float(width_mm),
                    "height_mm": float(height_mm),
                })
            with open(metrics_out, "w") as mf:
                json.dump(metrics, mf, indent=2)
            _generate_svg_dieline(
                mesh_path,
                str(svg_out),
                metrics["length_mm"],
                metrics["width_mm"],
                metrics["height_mm"],
                fit_clearance_mm,
                material_thickness_mm,
            )
        except Exception as ge:
            blender_err = f"Could not convert mesh: {ge}"
            print(f"[Fallback] {blender_err}")
            for failed_output in [glb_out, svg_out, metrics_out]:
                if failed_output.exists():
                    failed_output.unlink()

    # Check if we also have dimension-only request (no mesh)
    if not mesh_files and length_mm and width_mm and height_mm:
        _generate_svg_dieline(
            "",
            str(svg_out),
            length_mm,
            width_mm,
            height_mm,
            fit_clearance_mm,
            material_thickness_mm,
        )
        # Simple GLB box if no mesh
        if not glb_out.exists():
            try:
                import trimesh
                box = trimesh.creation.box([length_mm/1000, width_mm/1000, height_mm/1000])
                box.export(str(glb_out))
                metrics = {"length_mm": length_mm, "width_mm": width_mm, "height_mm": height_mm,
                           "volume_mm3": length_mm * width_mm * height_mm, "face_count": 12, "vertex_count": 8,
                           "fit_clearance_mm": fit_clearance_mm,
                           "material_thickness_mm": material_thickness_mm}
                with open(metrics_out, "w") as mf:
                    json.dump(metrics, mf, indent=2)
            except Exception as be:
                print(f"[Box] Could not create box GLB: {be}")
        blender_err = None

    glb_ok = glb_out.exists()
    svg_ok = svg_out.exists()
    pdf_err = None
    if svg_ok:
        try:
            _update_job(step=PIPELINE_STEPS[-1], steps_done=PIPELINE_STEPS[:-1])
            _generate_pdf_dieline(str(svg_out), str(pdf_out))
        except Exception as exc:
            pdf_err = f"Could not generate the dieline PDF: {exc}"
            print(f"[PDF] {pdf_err}")
    pdf_ok = pdf_out.exists()
    overview_pdf_ok = False
    if svg_ok:
        try:
            if metrics_out.exists():
                with open(metrics_out, encoding="utf-8") as mf:
                    report_dimensions = json.load(mf)
            else:
                report_dimensions = {}
            report_length = float(length_mm or report_dimensions.get("length_mm", 0))
            report_width = float(width_mm or report_dimensions.get("width_mm", 0))
            report_height = float(height_mm or report_dimensions.get("height_mm", 0))
            _generate_pdf_overview(
                str(svg_out),
                str(overview_pdf_out),
                report_length,
                report_width,
                report_height,
                material,
                degradation_months,
                fit_clearance_mm,
                material_thickness_mm,
            )
            overview_pdf_ok = True
        except Exception as exc:
            pdf_err = pdf_err or f"Could not generate the compact overview PDF: {exc}"
            print(f"[PDF] {pdf_err}")
    if pdf_err:
        final_err = pdf_err
    elif not glb_ok or not svg_ok:
        final_err = blender_err or "The pipeline did not produce both a GLB preview and dieline."
    else:
        final_err = None

    _update_job(
        status="done" if not final_err else "error",
        step=None, steps_done=PIPELINE_STEPS,
        error=final_err,
        finished_at=datetime.now(timezone.utc).isoformat(),
    )
    print(f"[OK] Pipeline done. GLB={glb_ok}  SVG={svg_ok}")

    # Update DB record
    if _job.get("id"):
        result_payload = {
            "glb_url": "/api/outputs/preview.glb" if glb_ok else None,
            "svg_url": "/api/outputs/dieline_pattern.svg" if svg_ok else None,
            "pdf_url": "/api/outputs/dieline_pattern.pdf" if pdf_ok else None,
            "overview_pdf_url": "/api/outputs/dieline_overview.pdf" if overview_pdf_ok else None,
            "status": "done" if not final_err else "error",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            with get_conn() as conn:
                conn.execute(
                    update(upload_history_table)
                    .where(upload_history_table.c.job_id == _job["id"])
                    .values(status=result_payload["status"], pipeline_result=result_payload)
                )
        except Exception as dbe:
            print(f"[DB] Update error: {dbe}")


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "morpho-pack-api",
        "version": "2.0.0",
        "blender": BLENDER_EXE,
        "blender_available": Path(BLENDER_EXE).exists(),
        "database": DATABASE_URL.split("///")[0],
    })


@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    name = data.get("name", "").strip()
    if not email or not password:
        return jsonify({"error": "Email and password required."}), 400
    hashed = _hash_pw(password)
    try:
        with get_conn() as conn:
            existing = conn.execute(select(users_table.c.id).where(users_table.c.email == email)).first()
            if existing:
                return jsonify({"error": "Email already registered."}), 409
            result = conn.execute(insert(users_table).values(
                email=email, password_hash=hashed,
                name=name or email.split("@")[0]
            ))
            uid = result.inserted_primary_key[0]
        return jsonify({"id": uid, "email": email, "name": name or email.split("@")[0]}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    if not email or not password:
        return jsonify({"error": "Email and password required."}), 400
    try:
        with get_conn() as conn:
            row = conn.execute(select(users_table).where(users_table.c.email == email)).first()
        if not row:
            return jsonify({"error": "Invalid credentials."}), 401
        if not row.password_hash or not _verify_pw(password, row.password_hash):
            return jsonify({"error": "Invalid credentials."}), 401
        return jsonify({"id": row.id, "email": row.email, "name": row.name, "avatar_url": row.avatar_url})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/google-auth", methods=["POST"])
def google_auth():
    """Authenticate via Google ID token or profile payload from frontend."""
    data = request.get_json() or {}
    google_id = data.get("google_id", "").strip()
    email = data.get("email", "").strip().lower()
    name = data.get("name", "").strip()
    avatar_url = data.get("avatar_url", "")
    if not email or not google_id:
        return jsonify({"error": "Google account details are incomplete. Please try signing in again."}), 400
    try:
        with get_conn() as conn:
            row = conn.execute(select(users_table).where(users_table.c.email == email)).first()
            if row:
                # Update Google info if needed
                if not row.google_id:
                    conn.execute(update(users_table).where(users_table.c.id == row.id).values(
                        google_id=google_id, avatar_url=avatar_url or row.avatar_url,
                        name=name or row.name
                    ))
                return jsonify({"id": row.id, "email": row.email, "name": row.name or name,
                                "avatar_url": avatar_url or row.avatar_url})
            # New user via Google
            result = conn.execute(insert(users_table).values(
                email=email, password_hash=None, name=name or email.split("@")[0],
                google_id=google_id, avatar_url=avatar_url
            ))
            uid = result.inserted_primary_key[0]
        return jsonify({"id": uid, "email": email, "name": name, "avatar_url": avatar_url}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/upload", methods=["POST"])
def upload():
    if "mesh" not in request.files:
        return jsonify({"error": "No 'mesh' file in request."}), 400
    f = request.files["mesh"]
    if not f.filename:
        return jsonify({"error": "Empty filename."}), 400
    ext = Path(f.filename).suffix.lower()
    if ext not in (".stl", ".obj"):
        return jsonify({"error": f"Unsupported format '{ext}'. Use .stl or .obj"}), 422

    # Purge old uploads
    for old in UPLOADS_DIR.glob("*"):
        if old.is_file() and old.name != ".gitkeep":
            old.unlink()

    safe_name = Path(f.filename).name
    dest = UPLOADS_DIR / safe_name
    f.save(str(dest))

    material = request.form.get("material", "cardboard")
    degradation_months = int(request.form.get("degradation_months", 0) or 0)
    user_id = request.form.get("user_id", type=int)
    job_id = f"job_{uuid.uuid4().hex[:12]}"

    try:
        with get_conn() as conn:
            conn.execute(insert(upload_history_table).values(
                user_id=user_id, job_id=job_id, file_name=safe_name,
                status="uploaded",
                meta={"material": material, "degradation_months": degradation_months}
            ))
    except Exception as de:
        print(f"[DB] Insert error: {de}")

    _update_job(id=job_id, status="uploaded", file=safe_name,
                step=None, steps_done=[], error=None,
                started_at=None, finished_at=None)

    return jsonify({"success": True, "job_id": job_id, "filename": safe_name,
                    "message": "Uploaded. Click 'Run Pipeline' to process."})


@app.route("/api/run-pipeline", methods=["POST"])
def run_pipeline():
    data = request.get_json() or {}
    job_id = data.get("job_id") or _job.get("id") or f"job_{uuid.uuid4().hex[:12]}"
    user_id = data.get("user_id")
    length_mm = data.get("length_mm")
    width_mm = data.get("width_mm")
    height_mm = data.get("height_mm")
    material = data.get("material", "cardboard")
    degradation_months = int(data.get("degradation_months", 0) or 0)
    fit_clearance_mm = float(data.get("fit_clearance_mm", 3) or 0)
    material_thickness_mm = float(data.get("material_thickness_mm", 1.5) or 0)
    if not math.isfinite(fit_clearance_mm) or fit_clearance_mm < 0:
        return jsonify({"error": "fit_clearance_mm must be a non-negative number."}), 400
    if not math.isfinite(material_thickness_mm) or material_thickness_mm <= 0:
        return jsonify({"error": "material_thickness_mm must be greater than zero."}), 400

    _update_job(id=job_id)

    t = threading.Thread(target=_run_pipeline_thread,
                         args=(
                             BLENDER_EXE, length_mm, width_mm, height_mm, material,
                             degradation_months, fit_clearance_mm, material_thickness_mm,
                         ))
    t.daemon = True
    t.start()

    return jsonify({"success": True, "job_id": job_id,
                    "message": "Pipeline started. Poll /api/pipeline-status for updates."})


@app.route("/api/regenerate-dieline", methods=["POST"])
def regenerate_dieline():
    """Regenerate dieline with custom dimensions (no re-upload required)."""
    data = request.get_json() or {}
    length_mm = float(data.get("length_mm", 0))
    width_mm = float(data.get("width_mm", 0))
    height_mm = float(data.get("height_mm", 0))
    if not all([length_mm > 0, width_mm > 0, height_mm > 0]):
        return jsonify({"error": "length_mm, width_mm, height_mm must be positive."}), 400
    material = data.get("material", "cardboard")
    degradation_months = int(data.get("degradation_months", 0) or 0)
    fit_clearance_mm = float(data.get("fit_clearance_mm", 3) or 0)
    material_thickness_mm = float(data.get("material_thickness_mm", 1.5) or 0)
    if not math.isfinite(fit_clearance_mm) or fit_clearance_mm < 0:
        return jsonify({"error": "fit_clearance_mm must be a non-negative number."}), 400
    if not math.isfinite(material_thickness_mm) or material_thickness_mm <= 0:
        return jsonify({"error": "material_thickness_mm must be greater than zero."}), 400

    job_id = _job.get("id") or f"job_{uuid.uuid4().hex[:12]}"
    _update_job(id=job_id)

    t = threading.Thread(target=_run_pipeline_thread,
                         args=(
                             BLENDER_EXE, length_mm, width_mm, height_mm, material,
                             degradation_months, fit_clearance_mm, material_thickness_mm,
                         ))
    t.daemon = True
    t.start()

    return jsonify({"success": True, "job_id": job_id,
                    "message": "Dieline regeneration started."})


@app.route("/api/custom-box", methods=["POST"])
def custom_box():
    """
    Generate a custom form-fitting 3D packaging enclosure (Base + Lid)
    using the Reform3d / Big-Hero-6 CAD kernel (manifold3d & trimesh).
    Analyzes 3D product mesh shape and synthesizes non-cuboid, contoured packaging.
    """
    uploaded_file = request.files.get("asset") or request.files.get("mesh")
    length_mm = float(request.form.get("length_mm", 0) or 0)
    width_mm = float(request.form.get("width_mm", 0) or 0)
    height_mm = float(request.form.get("height_mm", 0) or 0)
    clearance_mm = float(request.form.get("clearance_mm", 2.0) or 2.0)
    wall_mm = float(request.form.get("wall_mm", 2.5) or 2.5)
    floor_mm = float(request.form.get("floor_mm", 2.5) or 2.5)
    split_pct = float(request.form.get("split_pct", 0.55) or 0.55)

    mesh_path = None
    if uploaded_file and uploaded_file.filename:
        safe_name = Path(uploaded_file.filename).name
        dest = UPLOADS_DIR / f"custom_{safe_name}"
        uploaded_file.save(str(dest))
        ext = dest.suffix.lower()
        if ext in (".stl", ".obj", ".glb"):
            mesh_path = str(dest)
    else:
        # Check existing uploads or sample glass.stl
        existing = (
            list(UPLOADS_DIR.glob("*.stl")) + list(UPLOADS_DIR.glob("*.STL")) +
            list(UPLOADS_DIR.glob("*.obj")) + list(UPLOADS_DIR.glob("*.OBJ"))
        )
        if existing:
            mesh_path = str(existing[0])
        else:
            sample_stl = ROOT_DIR / "frontend" / "public" / "models" / "glass.stl"
            if sample_stl.exists():
                mesh_path = str(sample_stl)

    # 1. Run CAD Kernel Box Generator if 3D mesh is present
    cad_result = None
    if mesh_path and Path(mesh_path).exists():
        try:
            from cad_box_kernel import generate_custom_box_package
            cad_result = generate_custom_box_package(
                mesh_path=mesh_path,
                output_dir=OUTPUTS_DIR,
                clearance_mm=clearance_mm,
                wall_mm=wall_mm,
                floor_mm=floor_mm,
                split_pct=split_pct,
            )
            dims = cad_result["dimensions"]
            length_mm, width_mm, height_mm = dims["length_mm"], dims["width_mm"], dims["height_mm"]
        except Exception as cad_err:
            print(f"[Custom-Box] CAD Kernel notice: {cad_err}")

    # Fallback dimensions if manual
    if not all([length_mm > 0, width_mm > 0, height_mm > 0]):
        if cad_result and cad_result.get("dimensions"):
            d = cad_result["dimensions"]
            length_mm, width_mm, height_mm = d["length_mm"], d["width_mm"], d["height_mm"]
        else:
            length_mm, width_mm, height_mm = 80.0, 80.0, 100.0

    # 2. Generate 2D Dieline / Vector Blueprint
    svg_out = OUTPUTS_DIR / "custom_box_dieline.svg"
    pdf_out = OUTPUTS_DIR / "custom_box_dieline.pdf"
    _generate_svg_dieline("", str(svg_out), length_mm, width_mm, height_mm)
    try:
        _generate_pdf_dieline(str(svg_out), str(pdf_out))
    except Exception as pdf_error:
        print(f"[Custom-Box] PDF warning: {pdf_error}")

    # 3. Compute sustainability metrics
    from morpho_pipeline import compute_all_metrics
    material = request.form.get("material", "cardboard")
    sustainability_metrics = compute_all_metrics(length_mm, width_mm, height_mm, material)

    overview_pdf_out = OUTPUTS_DIR / "custom_box_overview.pdf"
    try:
        _generate_pdf_overview(
            str(svg_out),
            str(overview_pdf_out),
            length_mm,
            width_mm,
            height_mm,
            material,
        )
    except Exception as overview_error:
        print(f"[Custom-Box] Overview PDF warning: {overview_error}")

    resp_data = {
        "success": True,
        "is_cad_kernel": cad_result is not None,
        "shape_type": cad_result.get("shape_type", "Contoured Packaging Shell") if cad_result else "Custom Fitted Box",
        "rationale": cad_result.get("rationale", "") if cad_result else "Fitted box generated from dimensions.",
        "cad_code": cad_result.get("cad_code", "") if cad_result else "",
        "dimensions": {
            "length_mm": length_mm,
            "width_mm": width_mm,
            "height_mm": height_mm,
            "clearance_mm": clearance_mm,
            "wall_mm": wall_mm,
            "floor_mm": floor_mm,
            "split_ratio": split_pct,
        },
        "base_stl_url": cad_result["urls"]["base_stl"] if cad_result else None,
        "lid_stl_url": cad_result["urls"]["lid_stl"] if cad_result else None,
        "assembled_stl_url": cad_result["urls"]["assembled_stl"] if cad_result else None,
        "glb_preview_url": cad_result["urls"]["glb_preview"] if cad_result else None,
        "svg_url": "/api/outputs/custom_box_dieline.svg",
        "pdf_url": "/api/outputs/custom_box_dieline.pdf",
        "overview_pdf_url": "/api/outputs/custom_box_overview.pdf",
        "metrics": cad_result["metrics"] if cad_result else sustainability_metrics,
        "sustainability": sustainability_metrics,
    }

    user_id = request.form.get("user_id", type=int)

    # 4. Save to database history
    try:
        job_id = f"box_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
        saved_file_name = Path(mesh_path).name if mesh_path else "product_box.stl"
        with get_conn() as conn:
            conn.execute(
                insert(upload_history_table).values(
                    user_id=user_id,
                    job_id=job_id,
                    file_name=saved_file_name,
                    status="done",
                    pipeline_result=resp_data,
                    meta={
                        "type": "custom_box",
                        "material": material,
                        "clearance_mm": clearance_mm,
                        "wall_mm": wall_mm,
                        "void_reduction_pct": resp_data.get("metrics", {}).get("void_reduction_pct", 0),
                        "shape_type": resp_data.get("shape_type"),
                    }
                )
            )
            print(f"[Custom-Box] Recorded job {job_id} into upload_history_table")
    except Exception as db_err:
        print(f"[Custom-Box] DB insert warning: {db_err}")

    return jsonify(resp_data)


@app.route("/api/custom-unfold", methods=["POST"])
def custom_unfold():
    """
    Run Blender headless 3D mesh unfolding pipeline (unfold_pipeline.py)
    to generate custom form-fitting unfolded dieline SVG, 3D GLB preview,
    and compute comparative void, packaging, and carbon reduction statistics
    vs the standard rectangular box dieline.
    Records the run in upload_history_table.
    """
    uploaded_file = request.files.get("mesh") or request.files.get("asset")
    clearance_mm = float(request.form.get("clearance_mm", 2.5) or 2.5)
    thickness_mm = float(request.form.get("thickness_mm", 1.5) or 1.5)
    max_faces = int(request.form.get("max_faces", 1000) or 1000)
    material = request.form.get("material", "cardboard")
    degradation_months = int(request.form.get("degradation_months", 6) or 6)
    user_id = request.form.get("user_id", type=int)

    # 1. Determine mesh file path
    mesh_path = None
    file_name = "product_mesh.stl"
    if uploaded_file and uploaded_file.filename:
        safe_name = Path(uploaded_file.filename).name
        file_name = safe_name
        dest = UPLOADS_DIR / f"unfold_{safe_name}"
        uploaded_file.save(str(dest))
        mesh_path = str(dest)
    else:
        existing = (
            list(UPLOADS_DIR.glob("*.stl")) + list(UPLOADS_DIR.glob("*.STL")) +
            list(UPLOADS_DIR.glob("*.obj")) + list(UPLOADS_DIR.glob("*.OBJ"))
        )
        if existing:
            mesh_path = str(existing[0])
            file_name = existing[0].name
        else:
            sample_stl = ROOT_DIR / "frontend" / "public" / "models" / "glass.stl"
            if sample_stl.exists():
                mesh_path = str(sample_stl)
                file_name = "glass.stl"
            else:
                return jsonify({"error": "No mesh file uploaded or found on server."}), 400

    job_id = f"unfold_{uuid.uuid4().hex[:10]}"
    svg_out = OUTPUTS_DIR / "custom_unfold_dieline.svg"
    glb_out = OUTPUTS_DIR / "custom_unfold_preview.glb"
    json_out = OUTPUTS_DIR / "custom_unfold_metrics.json"

    # 2. Run Blender unfolding script
    blender_exe = BLENDER_EXE
    cmd = [
        blender_exe, "--background", "--python", str(UNFOLD_SCRIPT), "--",
        f"--mesh={mesh_path}",
        f"--clearance={clearance_mm}",
        f"--thickness={thickness_mm}",
        f"--max-faces={max_faces}",
        f"--output-svg={svg_out}",
        f"--output-glb={glb_out}",
        f"--output-json={json_out}",
    ]
    print(f"[Custom-Unfold] Executing: {' '.join(cmd)}")
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["MORPHO_UPLOADS"] = str(UPLOADS_DIR)
    env["MORPHO_OUTPUTS"] = str(OUTPUTS_DIR)

    try:
        proc = subprocess.run(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, encoding="utf-8", errors="replace", cwd=str(ENGINE_DIR), env=env, timeout=120
        )
        print(f"[Custom-Unfold] Blender returned code {proc.returncode}")
        if proc.returncode != 0 and not svg_out.exists():
            print(f"[Custom-Unfold] Blender stdout: {proc.stdout[:800]}")
    except Exception as exc:
        print(f"[Custom-Unfold] Subprocess error: {exc}")

    # Verify or fallback
    if not svg_out.exists() or svg_out.stat().st_size < 100 or not json_out.exists():
        try:
            m = _load_repaired_mesh(mesh_path)
            extents_mm = m.extents * 1000
            l_mm, w_mm, h_mm = float(extents_mm[0]), float(extents_mm[1]), float(extents_mm[2])
            vol_box_cm3 = (l_mm * w_mm * h_mm) / 1000.0
            vol_mesh_cm3 = abs(float(m.volume)) * 1e6
            area_mesh_cm2 = float(m.area) * 1e4
            void_cm3 = max(0.0, vol_box_cm3 - vol_mesh_cm3)
            void_red = (void_cm3 / vol_box_cm3 * 100.0) if vol_box_cm3 > 0 else 0.0

            allowance = 2 * (clearance_mm + thickness_mm)
            box_area_cm2 = 2 * ((l_mm + allowance)*(w_mm + allowance) + (l_mm + allowance)*(h_mm + allowance) + (w_mm + allowance)*(h_mm + allowance)) / 100.0
            unfold_area_cm2 = area_mesh_cm2 * 1.15
            mat_savings = max(0.0, (box_area_cm2 - unfold_area_cm2) / box_area_cm2 * 100.0) if box_area_cm2 > 0 else 0.0

            raw_metrics = {
                "bounding_box": {"length_mm": l_mm, "width_mm": w_mm, "height_mm": h_mm, "volume_cm3": vol_box_cm3},
                "mesh": {"volume_cm3": vol_mesh_cm3, "surface_area_cm2": area_mesh_cm2, "face_count": len(m.faces)},
                "comparison": {
                    "box_dieline_area_cm2": box_area_cm2,
                    "unfold_dieline_area_cm2": unfold_area_cm2,
                    "material_area_savings_pct": mat_savings,
                    "box_volume_cm3": vol_box_cm3,
                    "custom_volume_cm3": vol_mesh_cm3,
                    "void_volume_cm3": void_cm3,
                    "void_reduction_pct": void_red,
                    "volume_utilization_pct": (vol_mesh_cm3 / vol_box_cm3 * 100.0) if vol_box_cm3 > 0 else 100.0,
                    "fit_clearance_mm": clearance_mm,
                    "material_thickness_mm": thickness_mm,
                }
            }
            with open(json_out, "w") as jf:
                json.dump(raw_metrics, jf, indent=2)
            if not glb_out.exists():
                m.export(str(glb_out))
        except Exception as fb_err:
            return jsonify({"error": f"Failed to compute mesh dieline: {fb_err}"}), 500
    else:
        with open(json_out, encoding="utf-8") as jf:
            raw_metrics = json.load(jf)

    # 3. Compute detailed carbon & sustainability comparison
    from morpho_pipeline import MATERIAL_PROFILES
    profile = MATERIAL_PROFILES.get(material, MATERIAL_PROFILES["cardboard"])
    density = profile["density_kg_m3"]
    co2_per_kg = profile["co2_per_kg"]
    thickness_m = thickness_mm / 1000.0

    cmp = raw_metrics.get("comparison", {})
    box_area_m2 = (cmp.get("box_dieline_area_cm2", 1000.0)) / 10000.0
    unfold_area_m2 = (cmp.get("unfold_dieline_area_cm2", 700.0)) / 10000.0

    box_mass_kg = box_area_m2 * thickness_m * density
    unfold_mass_kg = unfold_area_m2 * thickness_m * density

    box_co2_kg = box_mass_kg * co2_per_kg
    unfold_co2_kg = unfold_mass_kg * co2_per_kg

    co2_avoided_kg = max(0.0, box_co2_kg - unfold_co2_kg)
    material_saved_grams = max(0.0, (box_mass_kg - unfold_mass_kg) * 1000.0)
    material_savings_pct = cmp.get("material_area_savings_pct", 30.0)
    void_reduction_pct = cmp.get("void_reduction_pct", 65.0)

    # Integrated Sustainability Score (0-100)
    carbon_score = min(40.0, (co2_avoided_kg / max(0.001, box_co2_kg)) * 40.0 + 15.0)
    circularity_score = profile["recyclability"] * 35.0
    void_score = (void_reduction_pct / 100.0) * 25.0
    sustainability_score = round(min(100.0, carbon_score + circularity_score + void_score), 1)

    comparison_stats = {
        "material": material,
        "material_name": profile["name"],
        "recyclability_pct": round(profile["recyclability"] * 100, 1),
        "biodegradable_months": profile["biodegradable_months"],
        "degradation_months": degradation_months,
        "box": {
            "volume_cm3": round(cmp.get("box_volume_cm3", 0), 2),
            "volume_liters": round(cmp.get("box_volume_cm3", 0) / 1000.0, 3),
            "dieline_area_cm2": round(cmp.get("box_dieline_area_cm2", 0), 1),
            "material_mass_grams": round(box_mass_kg * 1000.0, 1),
            "co2_emissions_grams": round(box_co2_kg * 1000.0, 1),
            "volume_efficiency_pct": round(cmp.get("volume_utilization_pct", 35.0), 1),
        },
        "custom_unfold": {
            "volume_cm3": round(cmp.get("custom_volume_cm3", 0), 2),
            "volume_liters": round(cmp.get("custom_volume_cm3", 0) / 1000.0, 3),
            "dieline_area_cm2": round(cmp.get("unfold_dieline_area_cm2", 0), 1),
            "material_mass_grams": round(unfold_mass_kg * 1000.0, 1),
            "co2_emissions_grams": round(unfold_co2_kg * 1000.0, 1),
            "volume_efficiency_pct": round(min(98.5, cmp.get("volume_utilization_pct", 35.0) * (cmp.get("box_volume_cm3", 1) / max(1, cmp.get("custom_volume_cm3", 1)))), 1),
        },
        "reduction": {
            "void_volume_cm3_saved": round(cmp.get("void_volume_cm3", 0), 2),
            "void_reduction_pct": round(void_reduction_pct, 1),
            "material_area_savings_pct": round(material_savings_pct, 1),
            "material_mass_saved_grams": round(material_saved_grams, 1),
            "co2_avoided_grams": round(co2_avoided_kg * 1000.0, 1),
            "co2_avoided_1k_units_kg": round(co2_avoided_kg * 1000.0, 2),
            "co2_avoided_10k_units_kg": round(co2_avoided_kg * 10000.0, 1),
            "pallet_freight_density_increase_pct": round(min(120.0, (cmp.get("box_volume_cm3", 1) / max(1, cmp.get("custom_volume_cm3", 1)) - 1) * 100), 1),
            "sustainability_score": sustainability_score,
        },
        "parameters": {
            "clearance_mm": clearance_mm,
            "thickness_mm": thickness_mm,
            "max_faces": max_faces,
        }
    }

    # 4. Optional PDF generation
    pdf_out = OUTPUTS_DIR / "custom_unfold_dieline.pdf"
    pdf_url = None
    try:
        _generate_pdf_dieline(str(svg_out), str(pdf_out))
        if pdf_out.exists():
            pdf_url = "/api/outputs/custom_unfold_dieline.pdf"
    except Exception as pe:
        print(f"[Custom-Unfold] PDF notice: {pe}")

    result_payload = {
        "success": True,
        "job_id": job_id,
        "file_name": file_name,
        "svg_url": "/api/outputs/custom_unfold_dieline.svg",
        "glb_url": "/api/outputs/custom_unfold_preview.glb",
        "pdf_url": pdf_url,
        "metrics": comparison_stats,
        "raw_mesh_metrics": raw_metrics,
        "status": "done",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    # 5. Save to database history
    try:
        with get_conn() as conn:
            conn.execute(
                insert(upload_history_table).values(
                    user_id=user_id,
                    job_id=job_id,
                    file_name=file_name,
                    status="done",
                    pipeline_result=result_payload,
                    meta={
                        "type": "custom_unfold",
                        "material": material,
                        "clearance_mm": clearance_mm,
                        "void_reduction_pct": round(void_reduction_pct, 1),
                        "material_savings_pct": round(material_savings_pct, 1),
                        "co2_avoided_grams": round(co2_avoided_kg * 1000.0, 1),
                        "sustainability_score": sustainability_score,
                    }
                )
            )
            print(f"[Custom-Unfold] Recorded job {job_id} into upload_history_table")
    except Exception as db_err:
        print(f"[Custom-Unfold] DB insert warning: {db_err}")

    return jsonify(result_payload)


@app.route("/api/pipeline-status", methods=["GET"])
def pipeline_status():
    with _job_lock:
        state = dict(_job)
    glb_ready = (OUTPUTS_DIR / "preview.glb").exists()
    svg_ready = (OUTPUTS_DIR / "dieline_pattern.svg").exists()
    metrics_ready = (OUTPUTS_DIR / "mesh_metrics.json").exists()

    # Load metrics if available
    mesh_metrics = None
    if metrics_ready:
        try:
            with open(OUTPUTS_DIR / "mesh_metrics.json") as mf:
                mesh_metrics = json.load(mf)
        except Exception:
            pass

    state["outputs"] = {
        "glb_ready": glb_ready,
        "glb_url": "/api/outputs/preview.glb" if glb_ready else None,
        "svg_ready": svg_ready,
        "svg_url": "/api/outputs/dieline_pattern.svg" if svg_ready else None,
        "pdf_ready": (OUTPUTS_DIR / "dieline_pattern.pdf").exists(),
        "pdf_url": "/api/outputs/dieline_pattern.pdf" if (OUTPUTS_DIR / "dieline_pattern.pdf").exists() else None,
        "overview_pdf_url": "/api/outputs/dieline_overview.pdf" if (OUTPUTS_DIR / "dieline_overview.pdf").exists() else None,
        "metrics_ready": metrics_ready,
        "mesh_metrics": mesh_metrics,
    }
    return jsonify(state)


@app.route("/api/metrics", methods=["GET", "POST"])
def get_metrics():
    """Compute sustainability metrics from query params or JSON body."""
    if request.method == "POST":
        data = request.get_json() or {}
    else:
        data = request.args.to_dict()

    try:
        length_mm = float(data.get("length_mm", 200))
        width_mm = float(data.get("width_mm", 150))
        height_mm = float(data.get("height_mm", 100))
        material = str(data.get("material", "cardboard"))
        degradation_months = int(data.get("degradation_months", 0))
    except (TypeError, ValueError) as e:
        return jsonify({"error": f"Invalid params: {e}"}), 400

    from morpho_pipeline import compute_all_metrics
    result = compute_all_metrics(length_mm, width_mm, height_mm, material, degradation_months)
    return jsonify(result)


@app.route("/api/history", methods=["GET"])
def history():
    user_id = request.args.get("user_id", type=int)
    try:
        with get_conn() as conn:
            if user_id:
                query = (
                    select(upload_history_table)
                    .where((upload_history_table.c.user_id == user_id) | (upload_history_table.c.user_id.is_(None)))
                    .order_by(upload_history_table.c.created_at.desc())
                    .limit(50)
                )
            else:
                query = (
                    select(upload_history_table)
                    .order_by(upload_history_table.c.created_at.desc())
                    .limit(50)
                )
            rows = conn.execute(query).all()
        items = []
        for r in rows:
            item = dict(r._mapping)
            if isinstance(item.get("created_at"), datetime):
                item["created_at"] = item["created_at"].isoformat()
            items.append(item)
        return jsonify(items)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/outputs/<path:filename>", methods=["GET"])
def serve_output(filename):
    filepath = OUTPUTS_DIR / filename
    if not filepath.exists():
        abort(404)
    if filepath.suffix.lower() == ".pdf":
        return send_file(str(filepath), mimetype="application/pdf", as_attachment=True,
                         download_name=filepath.name)
    return send_file(str(filepath))


@app.route("/", methods=["GET"])
def root():
    return jsonify({"message": "MorphoPack API v2.0", "docs": "/api/health"})


if __name__ == "__main__":
    sys.path.insert(0, str(SERVER_DIR))
    port = int(os.environ.get("PORT", 7071))
    print(f"[MorphoPack] API v2.0 running on http://localhost:{port}/api/health")
    app.run(host="0.0.0.0", port=port, debug=False)
