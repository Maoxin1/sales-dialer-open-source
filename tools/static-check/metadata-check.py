"""Check XML/plist references with installed Python; this does not compile mobile code."""
from pathlib import Path
import json
import os
import plistlib
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[2]
manifest_path = root / "prototypes/android/app/src/main/AndroidManifest.xml"
manifest = ET.parse(manifest_path).getroot()
android = "{http://schemas.android.com/apk/res/android}"
checks = []


def check(name, ok, detail):
    checks.append({"name": name, "passed": bool(ok), "detail": detail})
    if not ok:
        raise RuntimeError(f"{name}: {detail}")


application = manifest.find("application")
check("android_application_declared", application is not None, str(manifest_path.relative_to(root)))
source_dir = root / "prototypes/android/app/src/main/java/com/mantou/salesdialer/spike"
for component in list(application):
    if component.tag in ["activity", "receiver"]:
        name = component.attrib[android + "name"].lstrip(".")
        check("android_component_source_exists", (source_dir / (name + ".java")).is_file(), name)
check("android_receiver_not_exported", application.find("receiver").attrib[android + "exported"] == "false", "Internal alarm receiver")
info = plistlib.loads((root / "prototypes/ios/DialerProbe/Info.plist").read_bytes())
check("ios_info_plist_parse", info["CFBundlePackageType"] == "APPL", "Python plistlib")
check("ios_tel_query_declared", "tel" in info["LSApplicationQueriesSchemes"], "Public tel: capability query")
scheme = ET.parse(root / "prototypes/ios/DialerProbe.xcodeproj/xcshareddata/xcschemes/DialerProbe.xcscheme").getroot()
model = json.loads((root / "prototypes/ios/project-model.json").read_text(encoding="utf-8"))
refs = list(scheme.iter("BuildableReference"))
check("ios_scheme_target_references", all(model["objects"][r.attrib["BlueprintIdentifier"]]["isa"] == "PBXNativeTarget" for r in refs), len(refs))
check("ios_no_ungranted_dialer_entitlement", not list((root / "prototypes/ios").rglob("*.entitlements")), "No entitlement/profile fabricated for the mainland experiment")
report = {"passed": True, "checks": checks, "scope": "XML/plist and project references only; no platform build or calls"}
(Path(os.environ.get("DIALER_EVIDENCE_DIR", root / "evidence/step-2")) / "static-metadata-checks.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"passed": True, "checks": len(checks), "scope": report["scope"]}, ensure_ascii=False))
