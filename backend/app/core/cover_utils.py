"""统一资源封面读取工具。

reading_materials: 封面存在 cover_url 列
resources: 封面存在 metadata JSONB → cover_url 字段
"""


def get_cover_url(record: dict, module: str = "reading") -> str | None:
    """统一读取封面 URL。

    Args:
        record: Supabase 返回的原始记录 dict
        module: "reading" 或 "resource"
    """
    if module == "reading":
        return record.get("cover_url")
    # resource: 从 metadata.cover_url 读取
    metadata = record.get("metadata") or {}
    if isinstance(metadata, dict):
        return metadata.get("cover_url")
    return None
