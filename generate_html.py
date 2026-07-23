import markdown
import sys

def main():
    with open("corgi_pos_implemented_tz.md", "r", encoding="utf-8") as f:
        text = f.read()
    
    html_body = markdown.markdown(text, extensions=['extra', 'toc'])
    
    html = f"""<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>Corgi Cafe POS - Technical Specification</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
        
        :root {{
            --text-main: #334155;
            --text-heading: #0f172a;
            --accent: #3b82f6;
            --bg-code: #f1f5f9;
            --border: #e2e8f0;
        }}
        
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.7;
            color: var(--text-main);
            max-width: 850px;
            margin: 0 auto;
            padding: 40px;
            background-color: #fff;
            font-size: 15px;
        }}
        
        h1, h2, h3, h4 {{
            color: var(--text-heading);
            font-weight: 700;
            margin-top: 2em;
            margin-bottom: 0.75em;
            letter-spacing: -0.02em;
        }}
        
        h1 {{ 
            font-size: 2.25em; 
            border-bottom: 2px solid var(--border);
            padding-bottom: 0.3em;
            margin-top: 1em;
        }}
        
        h2 {{ 
            font-size: 1.75em; 
            border-bottom: 1px solid var(--border);
            padding-bottom: 0.3em;
        }}
        
        h3 {{ 
            font-size: 1.25em; 
            font-weight: 600;
        }}
        
        ul, ol {{ 
            padding-left: 1.5em; 
            margin-bottom: 1.5em;
        }}
        
        li {{ 
            margin-bottom: 0.5em; 
        }}
        
        li > ul {{
            margin-top: 0.5em;
        }}
        
        p {{
            margin-bottom: 1.2em;
        }}
        
        code {{
            font-family: 'Fira Code', 'Courier New', Courier, monospace;
            background-color: var(--bg-code);
            padding: 0.2em 0.4em;
            border-radius: 4px;
            font-size: 0.9em;
            color: #ef4444;
            border: 1px solid #e2e8f0;
        }}
        
        pre {{
            background-color: var(--text-heading);
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            margin-bottom: 1.5em;
        }}
        
        pre code {{
            background-color: transparent;
            color: #e2e8f0;
            border: none;
            padding: 0;
            font-size: 0.85em;
        }}
        
        hr {{
            height: 1px;
            padding: 0;
            margin: 2rem 0;
            background-color: var(--border);
            border: 0;
        }}
        
        strong {{ 
            font-weight: 600; 
            color: var(--text-heading); 
        }}
        
        em {{
            color: #64748b;
            font-style: italic;
        }}
        
        /* Print specifics */
        @media print {{
            @page {{
                margin: 20mm 15mm;
                size: A4;
            }}
            body {{ 
                padding: 0; 
                max-width: 100%; 
                font-size: 11pt;
            }}
            h2, h3 {{
                page-break-after: avoid;
            }}
            ul, p {{
                page-break-inside: avoid;
            }}
            a {{ text-decoration: none; color: black; }}
        }}
    </style>
</head>
<body>
    {html_body}
</body>
</html>
"""
    with open("corgi_pos_implemented_tz.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("Generated HTML successfully.")

if __name__ == "__main__":
    main()
