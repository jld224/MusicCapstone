from bs4 import BeautifulSoup
import urllib.parse  # For decoding URL-encoded strings
import json
import sys

def parse_ireal_playlist(html_content):
    songs = []
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Find the first <a> tag with href starting with "irealb://"
    link = soup.find('a', href=lambda href: href and href.startswith('irealb://'))
    if link:
        href = link['href']
        # Directly split the href by '===' to get individual song links
        individual_songs = href.split('irealb://')[1].split('===')
        
        for song_data in individual_songs:
            # Split each song entry by the first '=' to separate name from the rest of the data
            if '=' in song_data:  # Ensure there's an '=' in the song data
                name, data = song_data.split('=', 1)
                # URL-decode the name part to get the title
                title = urllib.parse.unquote(name)
                # The data part, representing the rest of the song's information, remains encoded
                # It's assumed here that the detailed data does not need decoding for this specific use case
                # If it does, you can decode it similarly with urllib.parse.unquote(data)
                songs.append({'link': f'irealb://{name}={data}', 'title': title})
    
    return songs

def main():
    if len(sys.argv) < 3:
        print("Usage: python parse_ireal_playlist.py <input_html_file> <output_json_file>")
        sys.exit(1)

    input_html_file = sys.argv[1]
    output_json_file = sys.argv[2]

    # Read HTML file content
    with open(input_html_file, 'r', encoding='utf-8') as file:
        html_content = file.read()

    # Parse songs from HTML content
    songs = parse_ireal_playlist(html_content)

    # Write the extracted songs to a JSON file
    with open(output_json_file, 'w', encoding='utf-8') as out_file:
        json.dump(songs, out_file, indent=4, ensure_ascii=False)

    print(f"Total songs extracted: {len(songs)}")  # Output the total number of songs extracted

if __name__ == '__main__':
    main()
