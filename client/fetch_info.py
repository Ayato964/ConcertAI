import requests
import json

url = "https://ad3c0c070cc3.ngrok-free.app/model_info"
headers = {"ngrok-skip-browser-warning": "true"}

try:
    response = requests.post(url, headers=headers)
    response.raise_for_status()
    data = response.json()
    with open('model_info_clean.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print("Successfully wrote to model_info_clean.json")
except Exception as e:
    print(f"Error: {e}")
