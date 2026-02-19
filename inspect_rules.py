import json

try:
    with open('model_info_response.json', 'r', encoding='utf-16') as f:
        data = json.load(f)
    
    rules = set()
    for key, model in data.items():
        if 'rule' in model:
            for rule_key in model['rule']:
                rules.add(rule_key)
                
    print(f"Found rules: {list(rules)}")
    
    # Also print an example rule object to see values
    for key, model in data.items():
        if 'rule' in model:
            print(f"Example rule object from model {key}: {json.dumps(model['rule'], indent=2)}")
            break
            
except Exception as e:
    print(f"Error: {e}")
