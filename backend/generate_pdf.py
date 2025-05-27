import sys
from weasyprint import HTML, CSS

DEFAULT_FONT_CONFIG = """
@font-face {
    font-family: 'Noto Sans CJK';
    src: url('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc');
}
body {
    font-family: 'Noto Sans CJK', 'WenQuanYi Zen Hei', sans-serif;
}
"""

STYLESHEET = """
body {
    font-family: 'Noto Sans CJK', 'WenQuanYi Zen Hei', sans-serif;
    margin: 20px;
    font-size: 10px;
}
table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
    table-layout: fixed; /* Important for respecting column widths */
}
th, td {
    border: 1px solid #ccc;
    padding: 6px;
    text-align: left;
    word-wrap: break-word; /* Allow long words to break */
    vertical-align: top; /* Align content to the top of the cell */
}
th {
    background-color: #f2f2f2;
    font-weight: bold;
}
.roteiro-header {
    text-align: center;
    margin-bottom: 20px;
}
.roteiro-header img {
    max-height: 60px;
    margin-bottom: 10px;
}
.roteiro-details p {
    margin: 3px 0;
    font-size: 11px;
}
.divisoria-row td {
    background-color: #e9e9e9;
    font-weight: bold;
    text-align: center;
    padding: 8px;
}
/* Hide elements marked with data-print-hide='true' */
[data-print-hide='true'] {
    display: none !important;
}
"""

def generate_pdf_from_html(html_content):
    try:
        # Combine default font config with other styles
        full_css = CSS(string=DEFAULT_FONT_CONFIG + STYLESHEET)
        html = HTML(string=html_content)
        pdf_bytes = html.write_pdf(stylesheets=[full_css])
        sys.stdout.buffer.write(pdf_bytes)
    except Exception as e:
        print(f"Error generating PDF: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    # Read HTML from stdin
    input_html = sys.stdin.read()
    generate_pdf_from_html(input_html)

