import re
import sys

def find_duplicate_classes(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex to find tags
    tags = re.findall(r'<[a-zA-Z0-9-]+[^>]*>', content)
    for tag in tags:
        if tag.count(' class="') > 1:
            print(f"Duplicate class in tag: {tag}")
        if ' :href="' in tag and ' ui-text-highlight"' in tag:
             print(f"Corrupted href in tag: {tag}")

if __name__ == "__main__":
    find_duplicate_classes(sys.argv[1])
