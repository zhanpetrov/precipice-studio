#!/usr/bin/env python3
"""
Generates PRECIPICE AI Actor Stills & Cinéma-Vérité Pre-Viz Clips in Google Flow
via Chrome Automation (Window 1323608001, Tab 79) and extracts high-res AI stills
into assets/actors/ and assets/generated/.
"""
import os
import shutil
import subprocess
import time
import urllib.request
import flow_bridge_server as fb

FFMPEG = "/Users/studio/.local/bin/ffmpeg"
BASE_DIR = "/Users/studio/Desktop/helloworld/precipice-studio"
ACTORS_DIR = os.path.join(BASE_DIR, "assets/actors")
GEN_DIR = os.path.join(BASE_DIR, "assets/generated")
ZHAN_SHOTS_DIR = "/Users/studio/Desktop/helloworld/zhan_natural_shots"

os.makedirs(ACTORS_DIR, exist_ok=True)
os.makedirs(GEN_DIR, exist_ok=True)

PRECIPICE_FLOW_PROMPTS = [
    (
        "PRECIPICE_FLOW_RUSS_LAMA_BAR",
        "AI_STILL_RUSS_LAMA_BAR.jpg",
        "Candid observational handheld 35mm cinema-verite medium close-up inside Lama Bar in Berkeley at night. A bald 60-year-old working-class contractor with a salt-and-pepper goatee, small silver hoop earring in his right ear, wearing a black-and-white buffalo check plaid flannel shirt, sits at a mahogany bar counter in warm Kodak Vision3 500T tungsten-amber and deep slate-teal neon reflections. He looks in three-quarter profile toward the bar door as distant blue and red protest lights flash outside the frosted glass window. Natural micro-expressions, organic breathing, gritty independent film grain, never looking at the lens."
    ),
    (
        "PRECIPICE_FLOW_KEN_FRENCH_DROP",
        "AI_STILL_KEN_FRENCH_DROP.jpg",
        "Candid handheld 35mm cinema-verite medium close-up inside a smoky dimly lit Berkeley bar and pool hall at night. A charismatic 62-year-old bar magician with swept-back silver-grey hair and sharp angular cheekbones, wearing a dark navy zip sweater over a striped collared shirt, performs the French Drop coin vanish sleight-of-hand trick between his fingers under a warm amber bar practical light. He leans across the wooden counter in three-quarter profile with a knowing, seductive con-man smile. Shallow depth of field, Kodak Vision3 500T 35mm film grain, authentic independent cinema."
    ),
    (
        "PRECIPICE_FLOW_ROB_DIRECT_ACTION",
        "AI_STILL_ROB_DIRECT_ACTION.jpg",
        "Candid observational handheld 16mm and 35mm cinema-verite medium shot inside a cluttered downstairs storage and rehearsal room in Berkeley with a red Persian rug and cardboard boxes on shelves. An 80-year-old independent film director wearing an olive-drab baseball cap, thick black-rimmed glasses, khaki field jacket over a black turtleneck, and silver rings on his fingers leans forward in his chair, gesturing with quiet intensity as he coaches two actors in an interrogation improvisation. High-contrast warm tungsten practical bulb overhead, raw Direct Action documentary realism."
    ),
]

def seed_zhan_and_existing_flow_assets():
    # Copy curated Zhan Flow videos and extract AI stills
    zhan_pairs = [
        ("ZHAN_METHOD_01.mp4", "PRECIPICE_FLOW_ZHAN_CAMERA_A.mp4", "AI_STILL_ZHAN_CAMERA_A.jpg", "00:00:03"),
        ("ZHAN_METHOD_03.mp4", "PRECIPICE_FLOW_POOL_HALL_rig.mp4", "AI_STILL_POOL_RIGGED_MATCH.jpg", "00:00:03"),
        ("ZHAN_METHOD_07.mp4", "PRECIPICE_FLOW_ZHAN_SOUND_SYNC.mp4", "AI_STILL_ZHAN_SOUND_SYNC.jpg", "00:00:03"),
    ]
    for src_mp4, dst_mp4, dst_jpg, ts in zhan_pairs:
        src_p = os.path.join(ZHAN_SHOTS_DIR, src_mp4)
        dst_v = os.path.join(GEN_DIR, dst_mp4)
        dst_i = os.path.join(ACTORS_DIR, dst_jpg)
        if os.path.exists(src_p):
            shutil.copy2(src_p, dst_v)
            subprocess.run(
                [FFMPEG, "-y", "-ss", ts, "-i", dst_v, "-frames:v", "1", "-q:v", "2", "-update", "1", dst_i],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            print("Seeded Flow asset:", dst_mp4, "->", dst_jpg)

def run_live_flow_batch():
    wid, tidx = "1323608001", "79"
    before = set(fb.get_flow_media_urls(wid, tidx).get("videos", []))
    print(f"Starting live Google Flow batch on {wid}:{tidx} (existing videos: {len(before)})")

    for slug, still_name, prompt in PRECIPICE_FLOW_PROMPTS:
        ins = fb.set_flow_prompt(wid, tidx, prompt)
        time.sleep(0.6)
        sub = fb.submit_flow_generation(wid, tidx)
        print(f"Submitted {slug}: insert={ins}, submit={sub}")
        time.sleep(3.5)

    # Poll for up to 135 seconds for new Flow videos
    downloaded = []
    start_t = time.time()
    while time.time() - start_t < 135 and len(downloaded) < len(PRECIPICE_FLOW_PROMPTS):
        time.sleep(9)
        curr = fb.get_flow_media_urls(wid, tidx).get("videos", [])
        new_urls = [u for u in curr if u not in before]
        print(f"  [+{int(time.time()-start_t)}s] New Flow videos ready: {len(new_urls)}/{len(PRECIPICE_FLOW_PROMPTS)}")
        if len(new_urls) >= len(PRECIPICE_FLOW_PROMPTS):
            break

    curr = fb.get_flow_media_urls(wid, tidx).get("videos", [])
    new_urls = [u for u in curr if u not in before]
    for idx, (slug, still_name, _) in enumerate(PRECIPICE_FLOW_PROMPTS):
        if idx < len(new_urls):
            url = new_urls[idx]
            out_mp4 = os.path.join(GEN_DIR, f"{slug}.mp4")
            out_jpg = os.path.join(ACTORS_DIR, still_name)
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=45) as r, open(out_mp4, "wb") as f:
                    f.write(r.read())
                subprocess.run(
                    [FFMPEG, "-y", "-ss", "00:00:02.5", "-i", out_mp4, "-frames:v", "1", "-q:v", "2", "-update", "1", out_jpg],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                )
                print(f"Downloaded & extracted AI still: {out_mp4} -> {out_jpg}")
            except Exception as e:
                print(f"Download error for {slug}: {e}")

if __name__ == "__main__":
    seed_zhan_and_existing_flow_assets()
    run_live_flow_batch()
    print("DONE generating PRECIPICE Flow AI Actor stills & clips.")
