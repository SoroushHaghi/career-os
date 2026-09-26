def classify_source(mime_type: str, name: str = "") -> str:
    mime = (mime_type or "").lower()
    lower = name.lower()

    if mime.startswith("image/"):
        return "image"
    if mime.startswith("audio/"):
        return "audio"
    if mime.startswith("video/"):
        return "video"
    if mime == "application/pdf" or lower.endswith(".pdf"):
        return "pdf"
    if "presentation" in mime or lower.endswith((".ppt", ".pptx")):
        return "presentation"
    if mime.startswith("text/") or lower.endswith((".md", ".txt", ".csv", ".json")):
        return "text"
    if "document" in mime or lower.endswith((".doc", ".docx")):
        return "document"
    return "binary"


PROCESSOR_ROUTE = {
    "image": "image_preprocessor",
    "audio": "audio_preprocessor",
    "video": "video_preprocessor",
    "pdf": "document_preprocessor",
    "presentation": "presentation_preprocessor",
    "text": "text_preprocessor",
    "document": "document_preprocessor",
    "binary": "manual_or_future_processor",
}
