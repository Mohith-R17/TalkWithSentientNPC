import json
import os

files = [
    r"backend\services\chatbot_service.py",
    r"backend\services\stt_service.py",
    r"backend\services\tts_service.py",
    r"backend\main.py",
    r"backend\transformer_chatbot.py",
    r"legacy\chatbot_app.py",
    r"benchmark.py",
    r"README.md",
    r"report .txt"
]

with open("workspace_dump.txt", "w", encoding="utf-8") as out_f:
    out_f.write("--- FILE CONTENTS ---\n")
    for f in files:
        if os.path.exists(f):
            try:
                content = open(f, "r", encoding="utf-8").read()
                out_f.write(f"\n\n================ {f} ================\n")
                out_f.write(content)
            except BaseException as e:
                out_f.write(f"Error reading {f}: {e}\n")

    out_f.write("\n\n================ training.ipynb ================\n")
    if os.path.exists("training.ipynb"):
        try:
            nb = json.load(open("training.ipynb", "r", encoding="utf-8"))
            for c in nb.get("cells", []):
                if c.get("cell_type") in ["code", "markdown"]:
                    source = "".join(c.get("source", []))
                    out_f.write(f"\n--- {c.get('cell_type').upper()} CELL ---\n{source}\n")
        except BaseException as e:
            out_f.write(f"Error reading training.ipynb: {e}\n")
