#!/usr/bin/env python3
"""
Split a markdown file into separate files based on split comments.
Usage: python3 split_markdown.py input.md [--output-dir ./output]

Split comments should be of the form:
<!-- SPLIT_OUTPUT: filename -->
"""

import argparse
import re
from pathlib import Path


def split_markdown(input_file, output_dir=None):
    """
    Split a markdown file based on split comments.
    
    Looks for comments of the form: <!-- SPLIT_OUTPUT: filename -->
    and creates separate files for each section that follows.
    
    Args:
        input_file: Path to input markdown file
        output_dir: Directory to output files (defaults to ./split_output)
    """
    input_path = Path(input_file)
    if not input_path.exists():
        print(f"Error: File '{input_file}' not found")
        return
    
    if output_dir is None:
        output_dir = Path("./split_output")
    else:
        output_dir = Path(output_dir)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    with open(input_path, 'r') as f:
        content = f.read()
    
    # Pattern to match split comments: <!-- SPLIT_OUTPUT: filename -->
    pattern = r'<!--\s*SPLIT_OUTPUT:\s*(\w+(?:[-_]\w+)*)\s*-->'
    
    matches = list(re.finditer(pattern, content))
    
    if not matches:
        print("No split comments found")
        return
    
    file_count = 0
    
    for i, match in enumerate(matches):
        filename = match.group(1)
        content_start = match.end()
        content_end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
        
        section_content = content[content_start:content_end].strip()
        
        output_file = output_dir / f"{filename}.md"
        with open(output_file, 'w') as f:
            f.write(section_content + '\n')
        
        print(f"Created: {output_file}")
        file_count += 1
    
    print(f"\nTotal files created: {file_count}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Split markdown file by split comments",
        epilog="Split comments: <!-- SPLIT_OUTPUT: filename -->"
    )
    parser.add_argument("input", help="Input markdown file")
    parser.add_argument("--output-dir", default="./split_output", help="Output directory")
    
    args = parser.parse_args()
    split_markdown(args.input, args.output_dir)
