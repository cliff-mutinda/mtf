"""Phone number normalization and validation utilities for Kenyan phone numbers."""
import re
from typing import Optional


def normalize_phone_number(phone: Optional[str]) -> Optional[str]:
    """
    Normalize any supported Kenyan phone number format to canonical format: 254XXXXXXXXX.
    
    Accepts formats such as:
      - 0712345678
      - 0112345678
      - +254712345678
      - +254 712 345 678
      - 254712345678
      - 712345678
      - (0712) 345-678

    Returns:
      Normalized 12-digit string starting with 2547 or 2541 (e.g. '254712345678'),
      or None if the phone number is invalid or cannot be parsed as a Kenyan mobile number.
    """
    if not phone or not isinstance(phone, str):
        return None

    # Strip whitespace, dashes, parentheses, dots, and plus signs
    cleaned = re.sub(r'[\s\-\(\)\.\+]', '', phone.strip())

    if not cleaned.isdigit():
        return None

    # Handle standard 10-digit format starting with 07 or 01 (e.g. 0712345678, 0112345678)
    if len(cleaned) == 10 and (cleaned.startswith('07') or cleaned.startswith('01')):
        return f"254{cleaned[1:]}"

    # Handle 9-digit format starting with 7 or 1 (e.g. 712345678, 112345678)
    if len(cleaned) == 9 and (cleaned.startswith('7') or cleaned.startswith('1')):
        return f"254{cleaned}"

    # Handle 12-digit format starting with 2547 or 2541 (e.g. 254712345678, 254112345678)
    if len(cleaned) == 12 and (cleaned.startswith('2547') or cleaned.startswith('2541')):
        return cleaned

    # Handle 13-digit format starting with 0254 (occasionally encountered)
    if len(cleaned) == 13 and cleaned.startswith('0254'):
        candidate = cleaned[1:]
        if candidate.startswith('2547') or candidate.startswith('2541'):
            return candidate

    return None


def is_valid_kenyan_phone(phone: Optional[str]) -> bool:
    """Return True if phone can be normalized to a valid Kenyan mobile number."""
    return normalize_phone_number(phone) is not None


def format_phone_display(normalized_phone: Optional[str]) -> str:
    """Format canonical 254XXXXXXXXX to readable '+254 XXX XXX XXX' format."""
    if not normalized_phone or len(normalized_phone) != 12:
        return normalized_phone or ""
    return f"+{normalized_phone[:3]} {normalized_phone[3:6]} {normalized_phone[6:9]} {normalized_phone[9:]}"
