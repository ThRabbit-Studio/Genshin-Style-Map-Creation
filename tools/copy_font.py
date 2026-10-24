# -*- coding: utf-8 -*-
import shutil, os, sys

SRC = r"C:\Users\tujin\Downloads" + "\\" + "\u5b57\u4f53" + r"\font.ttf"
DST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "fonts", "genshin.ttf")
os.makedirs(os.path.dirname(DST), exist_ok=True)
shutil.copy(SRC, DST)
print("font copied:", DST, os.path.getsize(DST) // 1024, "KB")
