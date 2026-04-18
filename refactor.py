import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'<!-- Application Logic -->\s*<script>(.*?)</script>', re.DOTALL)
match = pattern.search(content)

if match:
    js_content = match.group(1)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(js_content.strip())
        
    new_html = content[:match.start()] + '<!-- Application Logic -->\n  <script src="app.js"></script>\n  <script type="module" src="tests/stadiumiq.test.js"></script>\n' + content[match.end():]
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_html)
    print('Extraction complete')
else:
    print('Match not found')
