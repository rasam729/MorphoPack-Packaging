import json
import sys
import re
import numpy as np
import trimesh
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import server


def test_generate_pdf_from_dieline_svg(tmp_path):
    svg_path = tmp_path / "dieline.svg"
    pdf_path = tmp_path / "dieline.pdf"
    svg_path.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180">'
        '<rect x="10" y="10" width="280" height="160" fill="none" stroke="#111"/>'
        '</svg>',
        encoding="utf-8",
    )

    server._generate_pdf_dieline(str(svg_path), str(pdf_path))

    assert pdf_path.read_bytes().startswith(b"%PDF-")


def test_stl_repair_supports_ascii_and_binary_solid_header(tmp_path):
    source_mesh = trimesh.creation.cylinder(radius=0.04, height=0.1, sections=12)
    binary_stl = bytearray(source_mesh.export(file_type="stl"))
    binary_stl[:5] = b"solid"
    binary_stl.extend(b"extra metadata")
    binary_path = tmp_path / "cylinder.stl"
    binary_path.write_bytes(binary_stl)
    ascii_path = tmp_path / "cylinder-ascii.stl"
    ascii_path.write_text(source_mesh.export(file_type="stl_ascii"), encoding="ascii")

    for path in (binary_path, ascii_path):
        repaired = server._load_repaired_mesh(str(path))
        assert len(repaired.faces) > 0
        assert np.isfinite(repaired.vertices).all()
        assert (repaired.extents > 0).all()


def test_stl_millimetre_coordinates_are_normalized_to_metres(tmp_path):
    source_mesh = trimesh.creation.box(extents=[20, 15, 10])
    stl_path = tmp_path / "millimetre-coordinates.stl"
    source_mesh.export(stl_path)

    repaired = server._load_repaired_mesh(str(stl_path))

    assert np.allclose(repaired.extents, [0.02, 0.015, 0.01])


def test_manufacturing_pdf_keeps_svg_physical_size(tmp_path):
    svg_path = tmp_path / "dieline.svg"
    pdf_path = tmp_path / "dieline.pdf"
    server._generate_svg_dieline("", str(svg_path), 120, 80, 60)
    svg = svg_path.read_text(encoding="utf-8")
    width_mm = float(re.search(r'width="([\d.]+)mm"', svg).group(1))

    server._generate_pdf_dieline(str(svg_path), str(pdf_path))
    pdf_contents = pdf_path.read_bytes()
    media_box = re.search(rb"/MediaBox\s+\[([^\]]+)\]", pdf_contents)

    assert width_mm > 0
    assert b"Do not fit or scale to page." in pdf_contents
    assert media_box
    page_width_points = float(media_box.group(1).split()[2])
    assert abs(page_width_points - (width_mm * 72 / 25.4 + 56)) < 1


def test_dieline_includes_clearance_and_stock_allowances(tmp_path):
    svg_path = tmp_path / "dieline.svg"

    server._generate_svg_dieline("", str(svg_path), 120, 80, 60, 3, 1.5)

    svg = svg_path.read_text(encoding="utf-8")
    assert "129×89×69mm" in svg


def test_dieline_canvas_contains_legend_for_small_products(tmp_path):
    svg_path = tmp_path / "small-dieline.svg"

    server._generate_svg_dieline("", str(svg_path), 20, 20, 20)

    svg = svg_path.read_text(encoding="utf-8")
    canvas_width = float(re.search(r'viewBox="0 0 ([\d.]+)', svg).group(1))
    legend_text_end = 40 + 145 + len("Fold line") * 10 * 0.62
    assert canvas_width >= legend_text_end


def test_compact_overview_pdf_fits_a4_landscape_with_report_metrics(tmp_path):
    svg_path = tmp_path / "dieline.svg"
    pdf_path = tmp_path / "overview.pdf"
    server._generate_svg_dieline("", str(svg_path), 120, 80, 60)

    server._generate_pdf_overview(
        str(svg_path),
        str(pdf_path),
        120,
        80,
        60,
        "kraft",
        6,
    )

    pdf_contents = pdf_path.read_bytes()
    media_box = re.search(rb"/MediaBox\s+\[([^\]]+)\]", pdf_contents)
    assert pdf_contents.startswith(b"%PDF-")
    assert b"Fit-to-page design summary" in pdf_contents
    assert media_box
    page_width, page_height = map(float, media_box.group(1).split()[2:4])
    assert page_width > page_height
    assert page_width < 850
    assert page_height < 600


def test_pipeline_fallback_generates_manufacturing_exports(tmp_path, monkeypatch):
    uploads_path = tmp_path / "uploads"
    outputs_path = tmp_path / "outputs"
    uploads_path.mkdir()
    outputs_path.mkdir()
    cylinder = trimesh.creation.cylinder(radius=0.04, height=0.1, sections=12)
    cylinder.export(str(uploads_path / "cylinder.stl"))
    monkeypatch.setattr(server, "UPLOADS_DIR", uploads_path)
    monkeypatch.setattr(server, "OUTPUTS_DIR", outputs_path)
    previous_job = server._job.copy()
    server._update_job(id=None)

    try:
        server._run_pipeline_thread(
            str(tmp_path / "blender-not-installed.exe"),
            120,
            80,
            60,
        )
        pipeline_status = server._job["status"]
    finally:
        server._update_job(**previous_job)

    assert (outputs_path / "preview.glb").is_file()
    assert (outputs_path / "dieline_pattern.svg").is_file()
    assert (outputs_path / "dieline_pattern.pdf").read_bytes().startswith(b"%PDF-")
    assert (outputs_path / "dieline_overview.pdf").read_bytes().startswith(b"%PDF-")
    svg = (outputs_path / "dieline_pattern.svg").read_text(encoding="utf-8")
    assert '<path class="cut" d="M ' in svg
    assert "stroke: #10291B" in svg
    assert "129×89×69mm" in svg
    metrics = json.loads((outputs_path / "mesh_metrics.json").read_text())
    assert [metrics[key] for key in ("length_mm", "width_mm", "height_mm")] == [120, 80, 60]
    assert pipeline_status == "done"


def test_pipeline_recovers_legacy_stl_dimensions_that_were_1000x_too_large(tmp_path, monkeypatch):
    uploads_path = tmp_path / "uploads"
    outputs_path = tmp_path / "outputs"
    uploads_path.mkdir()
    outputs_path.mkdir()
    trimesh.creation.box(extents=[20, 15, 10]).export(uploads_path / "millimetres.stl")
    monkeypatch.setattr(server, "UPLOADS_DIR", uploads_path)
    monkeypatch.setattr(server, "OUTPUTS_DIR", outputs_path)
    previous_job = server._job.copy()
    server._update_job(id=None)

    try:
        server._run_pipeline_thread(
            str(tmp_path / "blender-not-installed.exe"),
            20000,
            15000,
            10000,
        )
        pipeline_status = server._job["status"]
    finally:
        server._update_job(**previous_job)

    metrics = json.loads((outputs_path / "mesh_metrics.json").read_text())
    svg = (outputs_path / "dieline_pattern.svg").read_text(encoding="utf-8")
    assert [metrics[key] for key in ("length_mm", "width_mm", "height_mm")] == [20, 15, 10]
    assert "29×24×19mm" in svg
    assert pipeline_status == "done"


def test_pdf_output_route_returns_download(tmp_path, monkeypatch):
    pdf_path = tmp_path / "dieline_pattern.pdf"
    pdf_path.write_bytes(b"%PDF-1.4 test")
    monkeypatch.setattr(server, "OUTPUTS_DIR", tmp_path)

    response = server.app.test_client().get("/api/outputs/dieline_pattern.pdf")

    assert response.status_code == 200
    assert response.mimetype == "application/pdf"
    assert response.headers["Content-Disposition"].startswith("attachment;")


def test_custom_box_generates_downloadable_pdf(tmp_path, monkeypatch):
    monkeypatch.setattr(server, "OUTPUTS_DIR", tmp_path)

    response = server.app.test_client().post(
        "/api/custom-box",
        data={"length_mm": "120", "width_mm": "80", "height_mm": "60", "material": "kraft"},
    )

    assert response.status_code == 200
    assert response.get_json()["pdf_url"] == "/api/outputs/custom_box_dieline.pdf"
    assert response.get_json()["overview_pdf_url"] == "/api/outputs/custom_box_overview.pdf"
    assert (tmp_path / "custom_box_dieline.pdf").read_bytes().startswith(b"%PDF-")
