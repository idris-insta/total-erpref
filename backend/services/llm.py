"""
services/llm.py — local LLM via Ollama.

complete(system, prompt) returns the model's text, or None on any failure
(timeout, server down, bad response). Callers must always handle None and fall
back to deterministic output — the agents never depend on the LLM being up.
"""
import os
import logging
import httpx

logger = logging.getLogger("llm")

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2")
TIMEOUT = float(os.environ.get("OLLAMA_TIMEOUT", "30"))


async def is_enabled() -> bool:
    """True if the Ollama server is reachable."""
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            r = await client.get(f"{OLLAMA_URL}/api/tags")
            return r.status_code == 200
    except Exception:
        return False


async def complete(system: str, prompt: str) -> str | None:
    """Single-shot completion. Returns text or None on failure."""
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "system": system,
        "stream": False,
        "options": {"temperature": 0.4},
    }
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.post(f"{OLLAMA_URL}/api/generate", json=payload)
            if r.status_code != 200:
                logger.warning("ollama %s: %s", r.status_code, r.text[:120])
                return None
            text = (r.json() or {}).get("response", "").strip()
            return text or None
    except Exception as e:
        logger.warning("ollama call failed: %s", e)
        return None
