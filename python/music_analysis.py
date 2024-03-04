import argparse
import json
from urllib.parse import unquote
from pyRealParser import Tune

def analyze_ireal_link(ireal_link):
    # Decode the URL-encoded iRealPro link
    decoded_link = unquote(ireal_link)

    try:
        # Attempt to parse the iRealPro content
        tunes = Tune.parse_ireal_url(decoded_link)
        if not tunes:
            raise ValueError("No tunes found in the provided iRealPro link.")

        # Assuming there's only one tune per link for this use case
        tune = tunes[0]

        # Format the analysis result
        analysis_result = {
            "title": tune.title,
            "composer": tune.composer,
            "style": tune.style,
            "key": tune.key,
            "time_signature": f"{tune.time_signature[0]}/{tune.time_signature[1]}",
            "measures": tune.measures_as_strings
        }

        # Write the analysis result to a file
        output_file = "analysis_result.json"  # Specify the output file name
        with open(output_file, "w") as file:
            json.dump({"results": analysis_result}, file, indent=4)

    except Exception as e:
        # Log and return errors during analysis in JSON format
        error_message = f"An error occurred during the analysis: {str(e)}"
        output_file = "analysis_result.json"  # Specify the output file name
        with open(output_file, "w") as file:
            json.dump({"error": error_message}, file, indent=4)

def main(ireal_link):
    analyze_ireal_link(ireal_link)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze iRealPro chart content for chord progressions and other musical elements.")
    parser.add_argument('ireal_link', type=str, help="Encoded iRealPro link.")
    args = parser.parse_args()
    
    main(args.ireal_link)
