#!/usr/bin/env python3
"""
Organizes individual high-res character stills and builds 4-panel AI Actor Reference Sheets
with the verified identities:
- Russ (Rusty) Murphy: Silver-grey swept-back hair, angular cheekbones, dark navy zip sweater over striped shirt.
- Ken Newman: Bald/shaved head, salt-and-pepper goatee, silver ear hoop, black-and-white buffalo check plaid flannel shirt.
- Rob Nilsson: Olive baseball cap / white hair, black-rimmed glasses, khaki field jacket over black turtleneck.
"""
import glob
import os
import shutil
import subprocess

FFMPEG = "/Users/studio/.local/bin/ffmpeg"
BASE_DIR = "/Users/studio/Desktop/helloworld/precipice-studio"
FRAMES_DIR = os.path.join(BASE_DIR, "assets/workshop_frames")
ACTORS_DIR = os.path.join(BASE_DIR, "assets/actors")
os.makedirs(ACTORS_DIR, exist_ok=True)

# Clean old CHAR_RUSS_* and CHAR_KEN_* files first so no stale filenames remain
for old_f in glob.glob(os.path.join(ACTORS_DIR, "CHAR_RUSS_*")) + glob.glob(os.path.join(ACTORS_DIR, "CHAR_KEN_*")):
    os.remove(old_f)

ACTOR_STILLS = {
    "russ_murphy": [
        ("w1_13_25m15s.jpg", "CHAR_RUSS_01_THREE_QUARTER_LEFT.jpg"),
        ("w1_16_31m30s.jpg", "CHAR_RUSS_02_CONTEMPLATIVE_FRONT.jpg"),
        ("w1_18_35m35s.jpg", "CHAR_RUSS_03_INTENSE_SPEECH.jpg"),
        ("w1_08_14m30s.jpg", "CHAR_RUSS_04_LEANING_BACK.jpg"),
        ("w1_22_40m45s.jpg", "CHAR_RUSS_05_HANDS_DETAIL.jpg"),
        ("w2_01_00m45s.jpg", "CHAR_RUSS_06_DINNER_TWO_SHOT.jpg"),
        ("w2_08_18m10s.jpg", "CHAR_RUSS_07_DINNER_PORTRAIT.jpg"),
        ("w1_25_48m15s.jpg", "CHAR_RUSS_08_WIDE_WORKSHOP.jpg"),
    ],
    "ken_newman": [
        ("w1_04_05m10s.jpg", "CHAR_KEN_01_GUITAR_PROFILE.jpg"),
        ("w1_09_16m40s.jpg", "CHAR_KEN_02_DETENTION_CLOSEUP.jpg"),
        ("w1_12_23m30s.jpg", "CHAR_KEN_03_THREE_QUARTER.jpg"),
        ("w1_15_30m05s.jpg", "CHAR_KEN_04_SILENCE_INTENSE.jpg"),
        ("w1_19_36m40s.jpg", "CHAR_KEN_05_BAR_CON_LOOK.jpg"),
        ("w1_23_42m50s.jpg", "CHAR_KEN_06_FRENCH_DROP_GESTURE.jpg"),
        ("w2_03_04m30s.jpg", "CHAR_KEN_07_DINNER_WARM.jpg"),
        ("w2_09_21m45s.jpg", "CHAR_KEN_08_DINNER_MEXICO_STORY.jpg"),
    ],
    "rob_nilsson": [
        ("w1_10_18m45s.jpg", "CHAR_ROB_01_CAP_GLASSES_FRONT.jpg"),
        ("w1_17_34m00s.jpg", "CHAR_ROB_02_OBSERVING_SCENE.jpg"),
        ("w1_20_37m50s.jpg", "CHAR_ROB_03_DIRECTING_HANDS.jpg"),
        ("w2_02_02m10s.jpg", "CHAR_ROB_04_DINNER_GESTURE.jpg"),
        ("w2_11_32m00s.jpg", "CHAR_ROB_05_POLITICAL_CINEMA.jpg"),
        ("w2_12_32m55s.jpg", "CHAR_ROB_06_ANTI_MAGA_CLOSEUP.jpg"),
    ],
}

def build_quad_sheet(img_paths, out_path):
    inputs = []
    filter_parts = []
    for i, p in enumerate(img_paths[:4]):
        inputs.extend(["-i", p])
        filter_parts.append(f"[{i}:v]scale=960:540[v{i}];")
    filter_complex = "".join(filter_parts) + "[v0][v1][v2][v3]concat=n=4:v=1:a=0,tile=2x2:padding=6:margin=6"
    cmd = [FFMPEG, "-y"] + inputs + ["-filter_complex", filter_complex, "-frames:v", "1", "-q:v", "2", "-update", "1", out_path]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Built quad sheet:", out_path)

if __name__ == "__main__":
    for actor, pairs in ACTOR_STILLS.items():
        copied = []
        for src_name, dst_name in pairs:
            src_p = os.path.join(FRAMES_DIR, src_name)
            dst_p = os.path.join(ACTORS_DIR, dst_name)
            if os.path.exists(src_p):
                shutil.copy2(src_p, dst_p)
                copied.append(dst_p)
        if len(copied) >= 4:
            sheet_p = os.path.join(ACTORS_DIR, f"CHAR_{actor.upper()}_QUAD_SHEET.jpg")
            build_quad_sheet(copied[:4], sheet_p)
    print("Corrected Actor stills and quad sheets ready.")
