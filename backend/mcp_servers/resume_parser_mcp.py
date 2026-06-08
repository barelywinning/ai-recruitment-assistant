"""
Resume Parser MCP Server.
Provides: extract_text(), clean_resume(), parse_resume()
Uses pdfplumber + PyPDF2 for PDF text extraction.
"""
import re
import io
from typing import Dict, Any, List, Optional


class ResumeParserMCPServer:
    """
    MCP Server for resume text extraction and preprocessing.
    Handles PDF parsing and text normalization.
    """

    def __init__(self):
        self.server_name = "ResumeParser-MCP-v1"

    def extract_text(self, file_bytes: bytes, filename: str = "resume.pdf") -> Dict[str, Any]:
        """
        Extract raw text from a PDF file.
        Tries pdfplumber first, falls back to PyPDF2.
        """
        text = ""
        method_used = ""
        page_count = 0

        # Try pdfplumber first (better layout handling)
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                page_count = len(pdf.pages)
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            method_used = "pdfplumber"
        except Exception as e:
            # Fallback to PyPDF2
            try:
                import PyPDF2
                reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
                page_count = len(reader.pages)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                method_used = "PyPDF2"
            except Exception as e2:
                return {
                    "success": False,
                    "error": f"PDF extraction failed: {str(e2)}",
                    "text": "",
                    "page_count": 0,
                    "method": "none"
                }

        return {
            "success": True,
            "text": text,
            "page_count": page_count,
            "method": method_used,
            "char_count": len(text),
            "filename": filename,
        }

    def clean_resume(self, raw_text: str) -> Dict[str, Any]:
        """
        Clean and normalize raw resume text.
        Removes excessive whitespace, special characters, and artifacts.
        """
        if not raw_text:
            return {"success": False, "cleaned_text": "", "error": "Empty input"}

        cleaned = raw_text

        # Remove null bytes and non-printable characters
        cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', ' ', cleaned)

        # Normalize line breaks
        cleaned = re.sub(r'\r\n', '\n', cleaned)
        cleaned = re.sub(r'\r', '\n', cleaned)

        # Remove excessive blank lines (keep max 2 consecutive)
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)

        # Normalize multiple spaces
        cleaned = re.sub(r' {3,}', ' ', cleaned)

        # Remove bullet unicode characters → plain dash
        cleaned = re.sub(r'[•●◆▶►]', '-', cleaned)

        # Strip leading/trailing whitespace per line
        lines = [line.strip() for line in cleaned.split('\n')]
        cleaned = '\n'.join(lines)

        # Final strip
        cleaned = cleaned.strip()

        return {
            "success": True,
            "cleaned_text": cleaned,
            "original_length": len(raw_text),
            "cleaned_length": len(cleaned),
            "reduction_pct": round((1 - len(cleaned) / max(len(raw_text), 1)) * 100, 1),
        }

    def parse_resume(self, cleaned_text: str) -> Dict[str, Any]:
        """
        Perform lightweight structural parsing to identify key sections.
        This is a pre-processing step before Gemini analysis.
        Returns section hints to improve AI accuracy.
        """
        sections = {}
        section_keywords = {
            "contact": ["email", "phone", "linkedin", "github", "address", "mobile", "tel"],
            "summary": ["summary", "objective", "profile", "about me", "overview"],
            "skills": ["skills", "technical skills", "core competencies", "expertise", "technologies"],
            "experience": ["experience", "work history", "employment", "career", "positions held"],
            "education": ["education", "academic", "university", "college", "degree", "school"],
            "certifications": ["certification", "certificate", "certified", "credential", "license"],
            "projects": ["projects", "portfolio", "achievements", "accomplishments"],
        }

        lines = cleaned_text.lower().split('\n')
        current_section = "header"
        section_start_lines: Dict[str, int] = {"header": 0}

        for i, line in enumerate(lines):
            stripped = line.strip()
            if len(stripped) < 3:
                continue
            for section, keywords in section_keywords.items():
                if any(kw in stripped for kw in keywords):
                    if len(stripped) < 50:  # Section headers are short
                        current_section = section
                        section_start_lines[section] = i
                        break

        # Extract email
        email_match = re.search(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            cleaned_text
        )

        # Extract phone
        phone_match = re.search(
            r'[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{3,6}[-\s\.]?[0-9]{0,4}',
            cleaned_text
        )

        # Extract URLs
        urls = re.findall(
            r'https?://[^\s<>"{}|\\^`\[\]]+',
            cleaned_text
        )

        sections_detected = list(section_start_lines.keys())

        return {
            "success": True,
            "sections_detected": sections_detected,
            "email_hint": email_match.group(0) if email_match else None,
            "phone_hint": phone_match.group(0) if phone_match else None,
            "urls": urls[:5],
            "word_count": len(cleaned_text.split()),
            "line_count": len(lines),
            "text_preview": cleaned_text[:500],
        }
