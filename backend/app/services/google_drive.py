from googleapiclient.discovery import build
from googleapiclient.http import MediaInMemoryUpload
from google.oauth2.credentials import Credentials


def list_drive_files(credentials: Credentials) -> list[dict]:
    service = build("drive", "v3", credentials=credentials)
    results = service.files().list(
        q="mimeType='application/vnd.google-apps.document'",
        fields="files(id, name, modifiedTime)",
        orderBy="modifiedTime desc",
        pageSize=50,
    ).execute()
    return results.get("files", [])


def export_google_doc_as_html(credentials: Credentials, file_id: str) -> str:
    service = build("drive", "v3", credentials=credentials)
    content = service.files().export(fileId=file_id, mimeType="text/html").execute()
    return content.decode("utf-8") if isinstance(content, bytes) else content


def get_file_name(credentials: Credentials, file_id: str) -> str:
    service = build("drive", "v3", credentials=credentials)
    file = service.files().get(fileId=file_id, fields="name").execute()
    return file["name"]


def create_google_doc(credentials: Credentials, title: str, html_content: str) -> str:
    service = build("drive", "v3", credentials=credentials)
    file_metadata = {"name": title, "mimeType": "application/vnd.google-apps.document"}
    media = MediaInMemoryUpload(html_content.encode("utf-8"), mimetype="text/html")
    file = service.files().create(body=file_metadata, media_body=media, fields="id").execute()
    return file["id"]
