import json

try:
    with open('model_info_response.json', 'r', encoding='utf-16') as f:
        data = json.load(f)
    
    if '0' in data:
        tag = data['0'].get('tag', {})
        print(f"Tag keys: {list(tag.keys())}")
except Exception as e:
    print(e)
