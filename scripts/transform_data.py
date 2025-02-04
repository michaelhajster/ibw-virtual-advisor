import json
import os
import re
from typing import Dict, List, Any
from bs4 import BeautifulSoup

def clean_markdown(text: str) -> str:
    """Clean markdown text by removing unnecessary elements and formatting."""
    # Remove image links
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Remove multiple newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Remove special characters
    text = text.replace('\\#', '#').replace('\\-', '-')
    return text.strip()

def extract_content_from_html(html_content: str) -> str:
    """Extract meaningful content from HTML."""
    soup = BeautifulSoup(html_content, 'html.parser')
    # Remove script and style elements
    for script in soup(["script", "style"]):
        script.decompose()
    # Get text
    text = soup.get_text()
    # Remove multiple spaces and newlines
    lines = (line.strip() for line in text.splitlines())
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    text = '\n'.join(chunk for chunk in chunks if chunk)
    return text

def transform_ibw_data(input_files: List[str], output_file: str):
    """Transform IBW program data into structured content."""
    documents = []
    
    # Content sections
    sections = {
        "program_overview": {
            "title": "Internationale Betriebswirtschaft (IBW) - Programmübersicht",
            "content": []
        },
        "curriculum": {
            "title": "Studienplan und Module",
            "content": []
        },
        "international": {
            "title": "Internationale Ausrichtung",
            "content": []
        },
        "practical": {
            "title": "Praxiserfahrung und Karriere",
            "content": []
        },
        "admission": {
            "title": "Bewerbung und Zulassung",
            "content": []
        }
    }
    
    for input_file in input_files:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        for item in data:
            content = item.get('markdown', '')
            metadata = item.get('metadata', {})
            
            # Clean content
            content = clean_markdown(content)
            
            # Extract relevant sections based on content
            if "Internationale Betriebswirtschaft" in content:
                if "Programm Overview" in content or "Überblick" in content:
                    sections["program_overview"]["content"].append(content)
                if "Curriculum" in content or "Studienplan" in content:
                    sections["curriculum"]["content"].append(content)
                if "International" in content or "Ausland" in content:
                    sections["international"]["content"].append(content)
                if "Praxis" in content or "Karriere" in content:
                    sections["practical"]["content"].append(content)
                if "Bewerbung" in content or "Zulassung" in content:
                    sections["admission"]["content"].append(content)
    
    # Create documents for each section
    for section_key, section_data in sections.items():
        if section_data["content"]:
            doc = {
                "markdown": f"# {section_data['title']}\n\n" + "\n\n".join(section_data["content"]),
                "metadata": {
                    "source": section_key,
                    "section": section_key,
                    "type": "program_details"
                }
            }
            documents.append(doc)
    
    # Write transformed data
    output_data = {
        "metadata": {
            "total_documents": len(documents),
            "created_at": "2024-01-30T23:21:13.137Z",
            "types": ["program_info", "curriculum", "admission", "international", "practical"],
            "sources": ["hs_aalen_website", "study_guide"]
        },
        "documents": documents
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

def main():
    # Input files
    input_files = [
        "data/Hochschule Aalen - Studienangebote Jetzt bewerben... (1).json",
        "data/transformed/transformed_1738274212693_22-internationale-betriebswirtschaft.json",
        "data/transformed/transformed_1738274214628_b-a-internationale-betriebswirtschaft_internationales.json"
    ]
    
    # Output file
    output_file = "data/ibw_content_clean.json"
    
    # Transform data
    transform_ibw_data(input_files, output_file)
    print(f"Transformed data written to {output_file}")

if __name__ == "__main__":
    main() 