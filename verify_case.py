import json

try:
    with open('model_info_verify.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if '0' in data:
        tag = data['0'].get('tag', {})
        instruments = tag.get('instruments')
        print(f"Instruments raw value: {instruments}")
        print(f"Instruments type: {type(instruments)}")
except Exception as e:
    print(f"Error: {e}")
