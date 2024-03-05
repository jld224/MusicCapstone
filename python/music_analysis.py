import argparse
import json
from urllib.parse import unquote
from pyRealParser import Tune

def analyze_ireal_link(ireal_link):
    decoded_link = unquote(ireal_link)

    try:
        tunes = Tune.parse_ireal_url(decoded_link)
        if not tunes:
            raise ValueError("No tunes found in the provided iRealPro link.")

        tune = tunes[0]

        analysis_result = {
            "title": tune.title,
            "composer": tune.composer,
            "style": tune.style,
            "key": tune.key,
            "time_signature": f"{tune.time_signature[0]}/{tune.time_signature[1]}",
            "measures": tune.measures_as_strings,
            "chord_string": tune.chord_string,
        }

        # Only print the JSON result to stdout
        print(json.dumps(analysis_result))

    except Exception as e:
        error_message = f"An error occurred during the analysis: {str(e)}"
        print(json.dumps({"error": error_message}))

def main(ireal_link):
    analyze_ireal_link(ireal_link)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze iRealPro chart content for chord progressions and other musical elements.")
    parser.add_argument('ireal_link', type=str, help="Encoded iRealPro link.")
    args = parser.parse_args()
    
    main(args.ireal_link)