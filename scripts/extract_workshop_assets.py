#!/usr/bin/env python3
"""
Extracts tone-mapped 1080p reference frames and clean voice samples from the
PRECIPICE Acting Workshop #1 (Aug-31-2026-1788230980_2108788.MOV) and
Dinner After the Workshop (IMG_4967.MOV) masters.
"""
import os
import subprocess
from concurrent.futures import ThreadPoolExecutor

FFMPEG = "/Users/studio/.local/bin/ffmpeg"
DRIVE_DIR = "/Users/studio/Library/CloudStorage/GoogleDrive-zhanpetrov8@gmail.com/My Drive/PRECIPICE"
VIDEO1 = os.path.join(DRIVE_DIR, "Aug-31-2026-1788230980_2108788.MOV")
VIDEO2 = os.path.join(DRIVE_DIR, "IMG_4967.MOV")
ZOOM38 = os.path.join(DRIVE_DIR, "ZOOM0038/ZOOM0038_LR.WAV")
ZOOM39 = os.path.join(DRIVE_DIR, "ZOOM0039/ZOOM0039_LR.WAV")

BASE_DIR = "/Users/studio/Desktop/helloworld/precipice-studio"
FRAMES_DIR = os.path.join(BASE_DIR, "assets/workshop_frames")
VOICES_DIR = os.path.join(BASE_DIR, "assets/voices")
SHEETS_DIR = os.path.join(BASE_DIR, "assets/sheets")

os.makedirs(FRAMES_DIR, exist_ok=True)
os.makedirs(VOICES_DIR, exist_ok=True)
os.makedirs(SHEETS_DIR, exist_ok=True)

TONEMAP_VF = (
    "zscale=t=linear:npl=100,format=gbrpf32le,"
    "zscale=p=bt709,tonemap=tonemap=hable:desat=0,"
    "zscale=t=bt709:m=bt709:r=tv,format=yuvj420p"
)

# 24 timestamps across Video 1 (Workshop #1, 50m53s)
W1_SAMPLES = [
    ("w1_01_00m15s", "00:00:15", "00:00 Arrival & Setup"),
    ("w1_02_01m15s", "00:01:15", "00:50 Guitar Hands Detail"),
    ("w1_03_02m45s", "00:02:45", "02:45 Guitar Warm-Up Portrait"),
    ("w1_04_05m10s", "00:05:10", "05:10 Warm-Up & Banter"),
    ("w1_05_07m15s", "00:07:15", "06:39 ICE Detention Setup"),
    ("w1_06_10m30s", "00:10:30", "09:52 Improvisation Begins"),
    ("w1_07_12m20s", "00:12:20", "12:20 Interrogation Angle"),
    ("w1_08_14m30s", "00:14:30", "13:45 Humor as Survival"),
    ("w1_09_16m40s", "00:16:40", "16:40 Two-Shot Tension"),
    ("w1_10_18m45s", "00:18:45", "18:02 Protest, Visibility & Fear"),
    ("w1_11_22m10s", "00:22:10", "21:42 Why Are We Here?"),
    ("w1_12_23m30s", "00:23:30", "22:56 They May Be Listening"),
    ("w1_13_25m15s", "00:25:15", "24:33 What Is America?"),
    ("w1_14_27m30s", "00:27:30", "26:30 Trust Collapses"),
    ("w1_15_30m05s", "00:30:05", "29:49 30s of Silence"),
    ("w1_16_31m30s", "00:31:30", "30:46 Actors Reflect"),
    ("w1_17_34m00s", "00:34:00", "33:31 Rob Develops Characters"),
    ("w1_18_35m35s", "00:35:35", "35:07 Activism, Illusion & Bar"),
    ("w1_19_36m40s", "00:36:40", "36:05 Get Him Downstairs"),
    ("w1_20_37m50s", "00:37:50", "37:20 Seduction & Con Game"),
    ("w1_21_38m50s", "00:38:50", "38:14 The Magic Is a Lie"),
    ("w1_22_40m45s", "00:40:45", "39:50 Using Magic at the Bar"),
    ("w1_23_42m50s", "00:42:50", "42:19 The French Drop"),
    ("w1_24_45m20s", "00:45:20", "44:10 Remembering Past Films"),
    ("w1_25_48m15s", "00:48:15", "47:27 Acting & Authenticity"),
    ("w1_26_50m10s", "00:50:10", "49:38 Reconnecting w/ Rob"),
]

# 12 timestamps across Video 2 (Dinner After Workshop, 33m08s)
W2_SAMPLES = [
    ("w2_01_00m45s", "00:00:45", "00:00 Martial Arts & Discipline"),
    ("w2_02_02m10s", "00:02:10", "01:52 Acting Pain & Authenticity"),
    ("w2_03_04m30s", "00:04:30", "04:08 Dinner Conversation"),
    ("w2_04_07m30s", "00:07:30", "07:14 Trust & Government"),
    ("w2_05_11m20s", "00:11:20", "10:53 Connecting Dinner to Improv"),
    ("w2_06_12m35s", "00:12:35", "12:14 The Camera & DHS"),
    ("w2_07_16m15s", "00:16:15", "15:48 Aging Musicians"),
    ("w2_08_18m10s", "00:18:10", "17:32 Casting Dylan in PRECIPICE"),
    ("w2_09_21m45s", "00:21:45", "21:13 Gangs & Cartels in Mexico"),
    ("w2_10_26m45s", "00:26:45", "26:18 Identity & Power"),
    ("w2_11_32m00s", "00:32:00", "31:40 Rob's Political Filmmaking"),
    ("w2_12_32m55s", "00:32:55", "32:49 An Anti-MAGA Movie"),
]

def extract_one(args):
    video_path, slug, ts, label = args
    out_path = os.path.join(FRAMES_DIR, f"{slug}.jpg")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 10000:
        return (slug, ts, label, out_path)
    cmd = [
        FFMPEG, "-y", "-ss", ts, "-i", video_path,
        "-frames:v", "1", "-vf", TONEMAP_VF,
        "-q:v", "2", "-update", "1", out_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return (slug, ts, label, out_path)

def make_contact_sheet(items, out_file, cols=4):
    valid = [p for _, _, _, p in items if os.path.exists(p)]
    if not valid:
        return
    rows = (len(valid) + cols - 1) // cols
    inputs = []
    filter_parts = []
    for i, p in enumerate(valid):
        inputs.extend(["-i", p])
        filter_parts.append(f"[{i}:v]scale=480:270[v{i}];")
    concat_in = "".join(f"[v{i}]" for i in range(len(valid)))
    filter_complex = "".join(filter_parts) + f"{concat_in}concat=n={len(valid)}:v=1:a=0,tile={cols}x{rows}:padding=4:margin=4"
    cmd = [FFMPEG, "-y"] + inputs + ["-filter_complex", filter_complex, "-frames:v", "1", "-q:v", "3", "-update", "1", out_file]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Saved contact sheet:", out_file)

def extract_voice_samples():
    voices = [
        # (slug, input_file, start_ts, duration, description)
        ("voice_russ_murphy_improv.mp3", VIDEO1, "00:14:10", "45", "Russ Murphy — Humor & Survival Improv Voice Reference"),
        ("voice_ken_newman_magic.mp3", VIDEO1, "00:40:10", "45", "Ken Newman — Bar Magic & Con Game Voice Reference"),
        ("voice_rob_nilsson_directing.mp3", VIDEO1, "00:33:35", "45", "Rob Nilsson — Direct Action Character Coaching Voice Reference"),
        ("voice_workshop_zoom0038.mp3", ZOOM38, "00:00:10", "45", "Zoom H6 24-bit Master Stem — Workshop Room Presence"),
    ]
    for fname, src, ss, dur, desc in voices:
        out_p = os.path.join(VOICES_DIR, fname)
        if os.path.exists(out_p) and os.path.getsize(out_p) > 5000:
            continue
        cmd = [
            FFMPEG, "-y", "-ss", ss, "-t", dur, "-i", src,
            "-vn", "-acodec", "libmp3lame", "-b:a", "192k", out_p
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("Extracted voice clip:", out_p)

if __name__ == "__main__":
    tasks1 = [(VIDEO1, s, t, l) for s, t, l in W1_SAMPLES]
    tasks2 = [(VIDEO2, s, t, l) for s, t, l in W2_SAMPLES]
    with ThreadPoolExecutor(max_workers=6) as ex:
        res1 = list(ex.map(extract_one, tasks1))
        res2 = list(ex.map(extract_one, tasks2))
    make_contact_sheet(res1, os.path.join(SHEETS_DIR, "workshop1_contact_sheet.jpg"), cols=4)
    make_contact_sheet(res2, os.path.join(SHEETS_DIR, "dinner_contact_sheet.jpg"), cols=4)
    extract_voice_samples()
    print("ALL EXTRACTIONS COMPLETE.")
