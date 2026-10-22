#!/usr/bin/env python3
"""
Builds Kodak Vision3 500T (Warm Tungsten-Amber #F59E0B & Deep Slate-Teal #0D1B2A)
AI Character Pre-Viz Stills & 6s Cinéma-Vérité Pre-Viz Loops with verified identities:
- Russ Murphy: 00:35:32 (Silver-haired actor in dark navy zip sweater)
- Ken Newman: 00:42:46 (Bald actor with goatee & buffalo plaid shirt performing The French Drop)
- Rob Nilsson: 00:37:46 (Director in cap, black-rimmed glasses, khaki jacket)
"""
import os
import subprocess

FFMPEG = "/Users/studio/.local/bin/ffmpeg"
DRIVE_DIR = "/Users/studio/Library/CloudStorage/GoogleDrive-zhanpetrov8@gmail.com/My Drive/PRECIPICE"
VIDEO1 = os.path.join(DRIVE_DIR, "Aug-31-2026-1788230980_2108788.MOV")

BASE_DIR = "/Users/studio/Desktop/helloworld/precipice-studio"
ACTORS_DIR = os.path.join(BASE_DIR, "assets/actors")
GEN_DIR = os.path.join(BASE_DIR, "assets/generated")
VOICES_DIR = os.path.join(BASE_DIR, "assets/voices")

KODAK_500T_VF = (
    "zscale=t=linear:npl=100,format=gbrpf32le,"
    "zscale=p=bt709,tonemap=tonemap=hable:desat=0,"
    "zscale=t=bt709:m=bt709:r=tv,format=yuvj420p,"
    "colorbalance=rs=-0.04:gs=-0.01:bs=0.08:rm=0.07:gm=0.02:bm=-0.05:rh=0.14:gh=0.06:bh=-0.08,"
    "curves=preset=strong_contrast,"
    "noise=alls=7:allf=t+u,"
    "drawbox=x=0:y=0:w=iw:h=86:color=black@0.92:t=fill,"
    "drawbox=x=0:y=ih-86:w=iw:h=86:color=black@0.92:t=fill"
)

JOBS = [
    (
        VIDEO1, "00:35:32", "6",
        os.path.join(ACTORS_DIR, "AI_STILL_RUSS_LAMA_BAR.jpg"),
        os.path.join(GEN_DIR, "PRECIPICE_FLOW_RUSS_LAMA_BAR.mp4")
    ),
    (
        VIDEO1, "00:42:46", "6",
        os.path.join(ACTORS_DIR, "AI_STILL_KEN_FRENCH_DROP.jpg"),
        os.path.join(GEN_DIR, "PRECIPICE_FLOW_KEN_FRENCH_DROP.mp4")
    ),
    (
        VIDEO1, "00:37:46", "6",
        os.path.join(ACTORS_DIR, "AI_STILL_ROB_DIRECT_ACTION.jpg"),
        os.path.join(GEN_DIR, "PRECIPICE_FLOW_ROB_DIRECT_ACTION.mp4")
    ),
]

if __name__ == "__main__":
    for src, ss, dur, out_jpg, out_mp4 in JOBS:
        subprocess.run(
            [FFMPEG, "-y", "-ss", ss, "-i", src, "-frames:v", "1", "-vf", KODAK_500T_VF, "-q:v", "2", "-update", "1", out_jpg],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        subprocess.run(
            [
                FFMPEG, "-y", "-ss", ss, "-t", dur, "-i", src,
                "-vf", KODAK_500T_VF,
                "-c:v", "h264_videotoolbox", "-b:v", "4500k", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "128k", out_mp4
            ],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        print("Built:", os.path.basename(out_jpg), "+", os.path.basename(out_mp4))

    # Re-extract voice stems mapped to the exact verified speakers:
    # Russ Murphy (silver-haired actor speaking at 00:24:33 "What Is America?")
    # Ken Newman (bald actor in buffalo plaid teaching "The French Drop" at 00:42:19)
    voice_fixes = [
        ("voice_russ_murphy_improv.m4a", VIDEO1, "00:24:33", "45"),
        ("voice_ken_newman_magic.m4a", VIDEO1, "00:42:19", "45"),
    ]
    for fname, src, ss, dur in voice_fixes:
        out_p = os.path.join(VOICES_DIR, fname)
        subprocess.run(
            [FFMPEG, "-y", "-ss", ss, "-t", dur, "-i", src, "-vn", "-c:a", "aac", "-b:a", "192k", out_p],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        print("Updated voice stem:", fname)
