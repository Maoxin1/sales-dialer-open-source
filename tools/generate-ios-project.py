"""Generate the small native Xcode scaffold; Xcode compilation is a separate check."""
from pathlib import Path
import json
import plistlib
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
IOS = ROOT / "prototypes" / "ios"
PROJECT = IOS / "DialerProbe.xcodeproj"
PROJECT.mkdir(parents=True, exist_ok=True)
objects = {}


def obj(number, isa, **fields):
    key = f"A{number:023X}"
    objects[key] = {"isa": isa, **fields}
    return key


sources = []
build_sources = []
for index, name in enumerate(["DialerProbeApp.swift", "ProbeModel.swift", "ContentView.swift"]):
    ref = obj(100 + index, "PBXFileReference", lastKnownFileType="sourcecode.swift", path=name, sourceTree="<group>")
    sources.append(ref)
    build_sources.append(obj(200 + index, "PBXBuildFile", fileRef=ref))
info = obj(110, "PBXFileReference", lastKnownFileType="text.plist.xml", path="Info.plist", sourceTree="<group>")
product = obj(120, "PBXFileReference", explicitFileType="wrapper.application", includeInIndex=0, path="DialerProbe.app", sourceTree="BUILT_PRODUCTS_DIR")
frameworks = []
framework_builds = []
for index, name in enumerate(["UIKit", "CallKit"]):
    ref = obj(130 + index, "PBXFileReference", lastKnownFileType="wrapper.framework", name=name + ".framework", path="System/Library/Frameworks/" + name + ".framework", sourceTree="SDKROOT")
    frameworks.append(ref)
    framework_builds.append(obj(230 + index, "PBXBuildFile", fileRef=ref))
source_group = obj(300, "PBXGroup", children=sources + [info], path="DialerProbe", sourceTree="<group>")
product_group = obj(301, "PBXGroup", children=[product], name="Products", sourceTree="<group>")
framework_group = obj(302, "PBXGroup", children=frameworks, name="Frameworks", sourceTree="<group>")
main_group = obj(303, "PBXGroup", children=[source_group, product_group, framework_group], sourceTree="<group>")
sources_phase = obj(400, "PBXSourcesBuildPhase", buildActionMask=2147483647, files=build_sources, runOnlyForDeploymentPostprocessing=0)
frameworks_phase = obj(401, "PBXFrameworksBuildPhase", buildActionMask=2147483647, files=framework_builds, runOnlyForDeploymentPostprocessing=0)
resources_phase = obj(402, "PBXResourcesBuildPhase", buildActionMask=2147483647, files=[], runOnlyForDeploymentPostprocessing=0)
project_configs = []
target_configs = []
for index, name in enumerate(["Debug", "Release"]):
    project_configs.append(obj(500 + index, "XCBuildConfiguration", buildSettings={"SDKROOT": "iphoneos", "IPHONEOS_DEPLOYMENT_TARGET": "17.0", "CLANG_ENABLE_MODULES": "YES", "SWIFT_VERSION": "5.0"}, name=name))
    settings = {"PRODUCT_NAME": "$(TARGET_NAME)", "PRODUCT_BUNDLE_IDENTIFIER": "com.mantou.salesdialer.spike.ios", "INFOPLIST_FILE": "DialerProbe/Info.plist", "GENERATE_INFOPLIST_FILE": "NO", "IPHONEOS_DEPLOYMENT_TARGET": "17.0", "SWIFT_VERSION": "5.0", "TARGETED_DEVICE_FAMILY": "1", "CODE_SIGN_STYLE": "Automatic", "DEVELOPMENT_TEAM": "", "SUPPORTED_PLATFORMS": "iphoneos iphonesimulator", "SWIFT_OPTIMIZATION_LEVEL": "-Onone" if name == "Debug" else "-O", "SWIFT_ACTIVE_COMPILATION_CONDITIONS": "DEBUG" if name == "Debug" else "", "LD_RUNPATH_SEARCH_PATHS": ["$(inherited)", "@executable_path/Frameworks"]}
    target_configs.append(obj(510 + index, "XCBuildConfiguration", buildSettings=settings, name=name))
project_config_list = obj(520, "XCConfigurationList", buildConfigurations=project_configs, defaultConfigurationIsVisible=0, defaultConfigurationName="Release")
target_config_list = obj(521, "XCConfigurationList", buildConfigurations=target_configs, defaultConfigurationIsVisible=0, defaultConfigurationName="Release")
target = obj(600, "PBXNativeTarget", buildConfigurationList=target_config_list, buildPhases=[sources_phase, frameworks_phase, resources_phase], buildRules=[], dependencies=[], name="DialerProbe", productName="DialerProbe", productReference=product, productType="com.apple.product-type.application")
project = obj(700, "PBXProject", attributes={"TargetAttributes": {target: {"ProvisioningStyle": "Automatic"}}}, buildConfigurationList=project_config_list, compatibilityVersion="Xcode 14.0", developmentRegion="en", hasScannedForEncodings=0, knownRegions=["en", "Base"], mainGroup=main_group, productRefGroup=product_group, projectDirPath="", projectRoot="", targets=[target])
model = {"archiveVersion": 1, "classes": {}, "objectVersion": 56, "objects": objects, "rootObject": project}


def atom(value):
    return value if re.fullmatch(r"[A-Za-z0-9_]+", value) else json.dumps(value)


def serialize(value, depth=0):
    indent = "\t" * depth
    if isinstance(value, dict):
        return "{\n" + "".join("\t" * (depth + 1) + atom(str(k)) + " = " + serialize(v, depth + 1) + ";\n" for k, v in value.items()) + indent + "}"
    if isinstance(value, list):
        return "(\n" + "".join("\t" * (depth + 1) + serialize(v, depth + 1) + ",\n" for v in value) + indent + ")"
    return str(value) if isinstance(value, int) else atom(value)


(PROJECT / "project.pbxproj").write_text("// !$*UTF8*$!\n" + serialize(model) + "\n", encoding="utf-8")
(IOS / "project-model.json").write_text(json.dumps(model, indent=2) + "\n", encoding="utf-8")
info_values = {"CFBundleDevelopmentRegion": "$(DEVELOPMENT_LANGUAGE)", "CFBundleExecutable": "$(EXECUTABLE_NAME)", "CFBundleIdentifier": "$(PRODUCT_BUNDLE_IDENTIFIER)", "CFBundleInfoDictionaryVersion": "6.0", "CFBundleName": "$(PRODUCT_NAME)", "CFBundleDisplayName": "销售拨号探索", "CFBundlePackageType": "APPL", "CFBundleShortVersionString": "0.1", "CFBundleVersion": "1", "LSRequiresIPhoneOS": True, "LSApplicationQueriesSchemes": ["tel"], "UILaunchScreen": {}, "UIApplicationSceneManifest": {"UIApplicationSupportsMultipleScenes": False}, "UISupportedInterfaceOrientations": ["UIInterfaceOrientationPortrait"], "UIFileSharingEnabled": True, "LSSupportsOpeningDocumentsInPlace": True}
(IOS / "DialerProbe" / "Info.plist").write_bytes(plistlib.dumps(info_values, sort_keys=False))
scheme = ET.Element("Scheme", LastUpgradeVersion="1600", version="1.3")
build = ET.SubElement(scheme, "BuildAction", parallelizeBuildables="YES", buildImplicitDependencies="YES")
entries = ET.SubElement(build, "BuildActionEntries")
entry = ET.SubElement(entries, "BuildActionEntry", buildForTesting="YES", buildForRunning="YES", buildForProfiling="YES", buildForArchiving="YES", buildForAnalyzing="YES")


def buildable(parent):
    ET.SubElement(parent, "BuildableReference", BuildableIdentifier="primary", BlueprintIdentifier=target, BuildableName="DialerProbe.app", BlueprintName="DialerProbe", ReferencedContainer="container:DialerProbe.xcodeproj")


buildable(entry)
ET.SubElement(scheme, "TestAction", buildConfiguration="Debug", selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB", selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB", shouldUseLaunchSchemeArgsEnv="YES")
launch = ET.SubElement(scheme, "LaunchAction", buildConfiguration="Debug", selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB", selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB", launchStyle="0", useCustomWorkingDirectory="NO", ignoresPersistentStateOnLaunch="NO", debugDocumentVersioning="YES", debugServiceExtension="internal", allowLocationSimulation="YES")
buildable(ET.SubElement(launch, "BuildableProductRunnable", runnableDebuggingMode="0"))
profile = ET.SubElement(scheme, "ProfileAction", buildConfiguration="Release", shouldUseLaunchSchemeArgsEnv="YES", savedToolIdentifier="", useCustomWorkingDirectory="NO", debugDocumentVersioning="YES")
buildable(ET.SubElement(profile, "BuildableProductRunnable", runnableDebuggingMode="0"))
ET.SubElement(scheme, "AnalyzeAction", buildConfiguration="Debug")
ET.SubElement(scheme, "ArchiveAction", buildConfiguration="Release", revealArchiveInOrganizer="YES")
scheme_dir = PROJECT / "xcshareddata" / "xcschemes"
scheme_dir.mkdir(parents=True, exist_ok=True)
ET.indent(scheme)
ET.ElementTree(scheme).write(scheme_dir / "DialerProbe.xcscheme", encoding="utf-8", xml_declaration=True)
print("Generated native Xcode scaffold: prototypes/ios/DialerProbe.xcodeproj")
