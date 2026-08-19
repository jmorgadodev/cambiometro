import json
import re
import sys
import unicodedata

import pypdfium2 as pdfium


STOP_WORDS = {
    "ante", "bajo", "como", "con", "contra", "desde", "donde", "durante", "entre", "esta", "este", "estos",
    "hacia", "hasta", "para", "pero", "porque", "sobre", "tambien", "tiene", "tras", "cual", "cuales", "cuya",
    "cuyo", "debe", "debera", "dentro", "dicho", "dicha", "mediante", "respecto", "senalado", "senalada",
    "informe", "servicio", "entidad", "plazo", "dias", "habiles", "fecha", "recepcion", "presente",
}


def normalize(value):
    ascii_value = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", ascii_value).strip()


def conclusion_parts(value):
    parts = [part.strip() for part in re.split(r"\n\s*\n", value or "") if len(normalize(part)) >= 60]
    return parts or ([value.strip()] if len(normalize(value)) >= 60 else [])


def candidate_needles(part):
    words = normalize(part).split()
    needles = []
    for size in (28, 20, 14):
        needle = " ".join(words[:size])
        if len(needle) >= 40:
            needles.append(needle)
    return needles


def candidate_ngrams(part, size=5, limit=80):
    words = normalize(part).split()[:limit]
    return {" ".join(words[index:index + size]) for index in range(max(0, len(words) - size + 1))}


def candidate_tokens(part, limit=120):
    words = normalize(part).split()[:limit]
    return {word for word in words if (len(word) >= 4 or word.isdigit()) and word not in STOP_WORDS}


def main(input_path, output_path):
    with open(input_path, encoding="utf-8") as stream:
        entries = json.load(stream)
    result = {}
    for entry in entries:
        try:
            parts = conclusion_parts(entry.get("conclusions", ""))
            unresolved = {index: candidate_needles(part) for index, part in enumerate(parts)}
            located = {}
            locator_methods = {}
            fuzzy_candidates = {index: candidate_ngrams(part) for index, part in enumerate(parts)}
            fuzzy_scores = {index: [] for index in range(len(parts))}
            token_candidates = {index: candidate_tokens(part) for index, part in enumerate(parts)}
            token_scores = {index: [] for index in range(len(parts))}
            text_character_count = 0
            document = pdfium.PdfDocument(entry["pdfPath"])
            try:
                page_count = len(document)
                for page_index in range(1, page_count + 1):
                    if not unresolved:
                        break
                    page = document[page_index - 1]
                    text_page = page.get_textpage()
                    try:
                        page_text = normalize(text_page.get_text_range() or "")
                        text_character_count += len(page_text)
                    finally:
                        text_page.close()
                        page.close()
                    for part_index, needles in list(unresolved.items()):
                        if any(needle in page_text for needle in needles):
                            located[part_index] = page_index
                            locator_methods[part_index] = "exact_text"
                            del unresolved[part_index]
                        else:
                            ngrams = fuzzy_candidates[part_index]
                            score = sum(ngram in page_text for ngram in ngrams) / len(ngrams) if ngrams else 0
                            if score:
                                fuzzy_scores[part_index].append((score, page_index))
                            tokens = token_candidates[part_index]
                            token_score = len(tokens.intersection(page_text.split())) / len(tokens) if tokens else 0
                            if token_score:
                                token_scores[part_index].append((token_score, page_index))
            finally:
                document.close()
            for part_index in list(unresolved):
                ranked = sorted(fuzzy_scores[part_index], reverse=True)
                best_score, best_page = ranked[0] if ranked else (0, None)
                second_score = ranked[1][0] if len(ranked) > 1 else 0
                if best_score >= 0.35 and best_score - second_score >= 0.1:
                    located[part_index] = best_page
                    locator_methods[part_index] = "fuzzy_5gram"
                    del unresolved[part_index]
            for part_index in list(unresolved):
                ranked = sorted(token_scores[part_index], reverse=True)
                best_score, best_page = ranked[0] if ranked else (0, None)
                second_score = ranked[1][0] if len(ranked) > 1 else 0
                if best_score >= 0.55 and best_score - second_score >= 0.12:
                    located[part_index] = best_page
                    locator_methods[part_index] = "distinctive_token_overlap"
                    del unresolved[part_index]
            findings = [{"text": part, "page": located[index], "locator_method": locator_methods[index]} for index, part in enumerate(parts) if index in located]
            if not parts:
                error = "CGR_CONCLUSIONS_NOT_PUBLISHED"
            else:
                error = ("CGR_PDF_OCR_REQUIRED" if text_character_count < 1000 else "CGR_CONCLUSION_PAGE_NOT_FOUND") if unresolved else None
            result[entry["documentId"]] = {"pageCount": page_count, "findings": findings, "error": error}
        except Exception as error:
            result[entry["documentId"]] = {"pageCount": None, "findings": [], "error": "CGR_PDF_EXTRACTION_FAILED", "diagnostic": str(error)}
    with open(output_path, "w", encoding="utf-8") as stream:
        json.dump(result, stream, ensure_ascii=False, sort_keys=True)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
