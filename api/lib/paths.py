"""Shared helpers for local model cache paths (writable on Vercel)."""
import os


def get_model_cache_dir(subdir: str) -> str:
    """
    Return a writable cache directory for ML models.
    On Vercel the filesystem is read-only except /tmp.
    """
    if os.environ.get("VERCEL"):
        base = "/tmp/querywise-cache"
    else:
        # api/.cache when running locally
        base = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".cache")
    path = os.path.join(base, subdir)
    os.makedirs(path, exist_ok=True)
    return path
