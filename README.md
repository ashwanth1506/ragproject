# Foldermind — private, local RAG

Upload a folder or files, then ask questions about their contents. The app extracts text, splits it into overlapping **1,000-character chunks** (with 150 characters of overlap), embeds chunks with the free `sentence-transformers/all-MiniLM-L6-v2` model, and stores them in a persistent local ChromaDB collection. Questions retrieve the five most similar chunks, send those passages to Groq for an answer, and show the source passages.

Embeddings and ChromaDB run locally. Groq requires an API key and API usage may be billed. Only the retrieved passages and question are sent to Groq; original uploaded files are not.

## Run on Windows

Use Python 3.11–3.13 for the best compatibility with the ML packages.

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
python -m uvicorn backend.app:app --reload
```

Copy `.env.example` to `.env`, add your Groq key to `GROQ_API_KEY`, and save. In PowerShell, use `Copy-Item .env.example .env` and `notepad .env`. The app reads `.env` for each question, so no server restart is needed after saving. The default model is `openai/gpt-oss-20b`. Keep `.env` private; it is ignored by git. Never put a real key in `.env.example`.

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). The first start downloads the embedding model and may take a few minutes. Allow network access for the initial model download and Groq API requests.

If your terminal is already in `backend`, run `..\.venv\Scripts\python.exe app.py` to start the same server directly.

## Supported files

PDF, DOCX, TXT, Markdown, HTML, CSV, JSON, XML, and common source/config files. Each file is limited to 20 MB; up to 100 files can be uploaded at a time. Scanned PDFs need OCR before uploading. Re-uploading a file with the same relative path replaces its indexed chunks.

## Data and privacy

ChromaDB data is saved in `data\chroma\`. Uploaded files are processed in memory and aren't saved as originals. The local embedding model runs on this computer. Retrieved passages are sent to Groq for answer generation. The UI is served by FastAPI, so keep the server bound to localhost unless you intend to expose it to other devices.
