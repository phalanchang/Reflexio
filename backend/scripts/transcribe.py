#!/usr/bin/env python3
"""faster-whisper を使った音声文字起こしスクリプト"""
import sys
import json
from faster_whisper import WhisperModel


def transcribe(audio_path):
    model = WhisperModel("Systran/faster-whisper-small", device="cpu", compute_type="int8")
    segments, info = model.transcribe(audio_path, language="ja")
    text = " ".join([seg.text for seg in segments])
    result = {
        "text": text,
        "language": info.language,
        "language_probability": info.language_probability,
        "duration": info.duration
    }
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "音声ファイルパスを指定してください"}), file=sys.stderr)
        sys.exit(1)
    transcribe(sys.argv[1])
